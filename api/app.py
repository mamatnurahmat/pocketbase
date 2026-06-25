import os
import uuid
from datetime import datetime, timezone

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_restx import Api, Resource, fields, reqparse

# ── Config ──────────────────────────────────────────────────────────
PB_URL = os.getenv("PB_URL", "http://pocketbase:8090")

app = Flask(__name__)
CORS(app)
api = Api(
    app,
    version="1.0",
    title="Kas Warga API",
    description="""
API untuk approve tagihan & topup wallet warga.

## Alur Testing
1. **POST /v1/auth/login** → dapatkan token
2. Copy token, klik tombol **Authorize** 🔒 di kanan atas
3. **POST /v1/tagihan/approve** → approve tagihan
""",
    doc="/swagger",
    prefix="/v1",
    authorizations={
        "Bearer": {
            "type": "apiKey",
            "in": "header",
            "name": "Authorization",
            "description": 'Masukkan: <strong>Bearer &lt;token&gt;</strong>',
        }
    },
    security=[{"Bearer": []}],
)

# ── Namespace ───────────────────────────────────────────────────────
auth_ns = api.namespace("auth", description="Autentikasi")
tagihan_ns = api.namespace("tagihan", description="Operasi tagihan")

# ── Models ──────────────────────────────────────────────────────────

login_model = api.model("LoginRequest", {
    "identity": fields.String(
        required=True,
        description="Nomor HP (08123456789) atau email",
        example="08123456789",
    ),
    "password": fields.String(
        required=True,
        description="Password akun",
        example="rahasia123",
    ),
})

login_response = api.model("LoginResponse", {
    "token": fields.String(description="Bearer token untuk Authorization header"),
    "user_id": fields.String(description="ID user"),
    "name": fields.String(description="Nama / username"),
    "message": fields.String(description="Status"),
})

approve_model = api.model("ApproveRequest", {
    "tagihan_id": fields.String(
        required=True,
        description="ID record tagihan (dari collection tagihan)",
        example="g1y2k3m4n5o6p7q8",
    ),
})

approve_response = api.model("ApproveResponse", {
    "success": fields.Boolean,
    "reference_no": fields.String(description="Nomor referensi transaksi topup"),
    "wallet_type": fields.String(description="Tujuan topup: PERSONAL atau KAS"),
    "balance_before": fields.Float,
    "balance_after": fields.Float,
    "message": fields.String,
})

# ── PocketBase helper ───────────────────────────────────────────────

def pb_headers(token: str) -> dict:
    return {"Authorization": token, "Content-Type": "application/json"}


def pb_get(path: str, token: str, **kwargs) -> dict:
    r = requests.get(f"{PB_URL}/api/{path}", headers=pb_headers(token), params=kwargs)
    r.raise_for_status()
    return r.json()


def pb_post(path: str, token: str, body: dict) -> dict:
    r = requests.post(f"{PB_URL}/api/{path}", headers=pb_headers(token), json=body)
    r.raise_for_status()
    return r.json()


def pb_patch(path: str, token: str, body: dict) -> dict:
    r = requests.patch(f"{PB_URL}/api/{path}", headers=pb_headers(token), json=body)
    r.raise_for_status()
    return r.json()


def error_response(msg: str, status: int):
    return api.abort(status, msg)


# ── Endpoints ───────────────────────────────────────────────────────

# ── Auth ────────────────────────────────────────────────────────

@auth_ns.route("/login")
class AuthLogin(Resource):
    @auth_ns.expect(login_model)
    @auth_ns.response(200, "Login berhasil", login_response)
    @auth_ns.response(401, "Kredensial salah")
    @auth_ns.response(502, "PocketBase error")
    def post(self):
        """Login untuk mendapatkan token Bearer.\n\n
        Return token yang bisa dipakai di semua endpoint dengan header:\n
        `Authorization: <token>`\n
        (atau klik Authorize 🔒 di kanan atas Swagger UI)
        """
        data = request.get_json(silent=True) or {}
        identity = data.get("identity", "").strip()
        password = data.get("password", "").strip()

        if not identity or not password:
            return error_response("identity dan password diperlukan", 400)

        try:
            r = requests.post(f"{PB_URL}/api/collections/users/auth-with-password", json={
                "identity": identity,
                "password": password,
            })
            r.raise_for_status()
            body = r.json()
            return {
                "token": body.get("token", ""),
                "user_id": body.get("record", {}).get("id", ""),
                "name": body.get("record", {}).get("name") or body.get("record", {}).get("username", ""),
                "message": "Login berhasil",
            }, 200
        except requests.HTTPError as e:
            if e.response.status_code == 400:
                return error_response("Nomor HP / Email atau password salah", 401)
            return error_response(f"PocketBase error ({e.response.status_code})", 502)
        except Exception as e:
            return error_response(str(e), 500)


# ── Tagihan ─────────────────────────────────────────────────────

@tagihan_ns.route("/approve")
class TagihanApprove(Resource):
    @tagihan_ns.expect(approve_model)
    @tagihan_ns.response(200, "Berhasil", approve_response)
    @tagihan_ns.response(400, "Request tidak valid")
    @tagihan_ns.response(401, "Token tidak valid")
    @tagihan_ns.response(502, "PocketBase error")
    def post(self):
        """Approve tagihan → lunas + topup wallet warga + buat transaksi & ledger.

        Header: Authorization = token user pengurus
        Body:   { "tagihan_id": "..." }
        """
        token = request.headers.get("Authorization", "")
        if not token:
            return error_response("Header Authorization diperlukan", 401)

        data = request.get_json(silent=True) or {}
        tagihan_id = data.get("tagihan_id", "").strip()
        if not tagihan_id:
            return error_response("tagihan_id diperlukan", 400)

        try:
            # 1. Get tagihan (expand iuran untuk cek jatuh_tempo)
            tagihan = pb_get(f"collections/tagihan/records/{tagihan_id}", token, expand="iuran")

            # 2. Update tagihan → Lunas
            pb_patch(f"collections/tagihan/records/{tagihan_id}", token, {
                "status_pembayaran": "Lunas",
            })

            warga_id = tagihan.get("warga")
            nominal = tagihan.get("nominal", 0)

            if not warga_id or nominal <= 0:
                return {
                    "success": True,
                    "reference_no": None,
                    "wallet_type": None,
                    "balance_before": None,
                    "balance_after": None,
                    "message": "Tagihan disetujui tanpa topup (nominal 0 atau warga tidak ditemukan)",
                }, 200

            # 3. Cek jatuh_tempo dari iuran → tentukan wallet tujuan
            iuran = (tagihan.get("expand") or {}).get("iuran") or {}
            jatuh_tempo = iuran.get("jatuh_tempo", "")

            now = datetime.now(timezone.utc)
            current_month = now.month
            current_year = now.year

            transfer_ke_kas = True  # default: iuran jatuh tempo → KAS
            if jatuh_tempo:
                try:
                    jt = datetime.fromisoformat(jatuh_tempo.replace("Z", "+00:00"))
                    # Jika jatuh_tempo bulan depan atau setelahnya → ke wallet pribadi
                    if jt.year > current_year or (jt.year == current_year and jt.month > current_month):
                        transfer_ke_kas = False
                except (ValueError, AttributeError):
                    pass  # format tanggal invalid → default ke KAS

            # 4. Get warga → user
            warga = pb_get(f"collections/warga/records/{warga_id}", token)
            user_id = warga.get("user")

            # 5. Find target wallet
            if transfer_ke_kas:
                wallet_filter = 'wallet_type="KAS"'
                wallet_type = "KAS"
            else:
                wallet_filter = f'user="{user_id}" && wallet_type="PERSONAL"'
                wallet_type = "PERSONAL"

            wallets = pb_get(
                f"collections/wallets/records",
                token,
                filter=wallet_filter,
            )
            wallet_items = wallets.get("items", [])

            if not wallet_items:
                return error_response(
                    f"Wallet {wallet_type} tidak ditemukan"
                    + (f" untuk user {user_id}" if not transfer_ke_kas else ""),
                    400,
                )

            wallet = wallet_items[0]
            # ponytail: PocketBase v0.39 rejects balance=0 → sentinel 0.01
            raw_before = wallet.get("balance", 0) or 0       # simpanan DB (0.01 sentinel)
            real_before = 0 if raw_before < 1 else raw_before # bersihkan sentinel
            real_after = real_before + nominal

            # 6. Update wallet balance (simpan bersih, kecuali <1 → sentinel)
            new_balance = 0.01 if real_after < 1 else real_after
            pb_patch(f"collections/wallets/records/{wallet['id']}", token, {
                "balance": new_balance,
            })

            # 7. Create TOPUP transaction
            now_iso = datetime.now(timezone.utc).isoformat()
            ref_no = "TRX-" + now_iso[:10].replace("-", "") + "-" + uuid.uuid4().hex[:4].upper()

            trx = pb_post(f"collections/transactions/records", token, {
                "reference_no": ref_no,
                "type": "TOPUP",
                "status": "SUCCESS",
                "to_wallet": wallet["id"],
                "amount": nominal,
                "fee": 0,
                "net_amount": nominal,
                "note": f"Auto topup dari tagihan #{tagihan_id} → {wallet_type}",
                "created_by": _get_user_id(token) or "",
            })

            # 8. Create ledger entry (PB reject 0 → simpan raw/sentinel)
            pb_post(f"collections/ledgers/records", token, {
                "wallet": wallet["id"],
                "transaction": trx["id"],
                "entry_type": "CREDIT",
                "amount": nominal,
                "balance_before": raw_before,
                "balance_after": raw_before + nominal,
            })

            return {
                "success": True,
                "reference_no": ref_no,
                "wallet_type": wallet_type,
                "balance_before": real_before,
                "balance_after": real_after,
                "message": f"Tagihan disetujui, topup ke wallet {wallet_type} berhasil",
            }, 200

        except requests.HTTPError as e:
            status = e.response.status_code
            msg = e.response.text[:200]
            return error_response(f"PocketBase error ({status}): {msg}", 502 if status >= 500 else 400)
        except Exception as e:
            return error_response(str(e), 500)


def _get_user_id(token: str) -> str | None:
    """Extract user id from token (decode JWT payload without verification)."""
    try:
        parts = token.replace("Bearer ", "").split(".")
        if len(parts) == 3:
            import base64, json
            payload = parts[1]
            # pad base64
            payload += "=" * (4 - len(payload) % 4)
            decoded = json.loads(base64.urlsafe_b64decode(payload))
            return decoded.get("id")
    except Exception:
        pass
    return None


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8888, debug=True)
