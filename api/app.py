import os
import sys
import uuid
import logging
from datetime import datetime, timezone

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_restx import Api, Resource, fields, reqparse

# ── Upload Parser (Swagger sample) ──────────────────────────────────
upload_parser = reqparse.RequestParser(bundle_errors=True)
upload_parser.add_argument(
    "warga_id", type=str, required=True,
    location="form",
    help="ID warga (contoh: 9wu3x7k2m1n4v5p6)",
)
upload_parser.add_argument(
    "iuran_ids[]", type=str, required=True,
    action="append", location="form",
    help="ID iuran, bisa dikirim multiple (contoh: 8abc123def456gh)",
)
upload_parser.add_argument(
    "file_bukti", type=type(open), required=True,
    location="files",
    help="File bukti pembayaran (Gambar/PDF, max ~10MB)",
)

# ── Logging ─────────────────────────────────────────────────────────
# Gunicorn captures stdout/stderr from workers with --capture-output.
# Use explicit print/flush + sys.stderr for reliability.
import sys

log = logging.getLogger("kas-warga-api")
log.setLevel(logging.INFO)
# Add a handler that writes to stderr (gunicorn captures stderr)
_h = logging.StreamHandler(sys.stderr)
_h.setFormatter(logging.Formatter(
    "%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
))
log.handlers.clear()
log.addHandler(_h)
# Prevent propagation to root logger to avoid duplicates
log.propagate = False

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
iuran_ns = api.namespace("iuran", description="Upload bukti bayar")

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
    return {"message": msg, "status": status}, status


def pb_post_multipart(path: str, token: str, data: dict, files: dict) -> dict:
    """POST multipart/form-data ke PocketBase (untuk file upload)."""
    headers = {"Authorization": token}
    r = requests.post(f"{PB_URL}/api/{path}", headers=headers, data=data, files=files)
    r.raise_for_status()
    return r.json()


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
                log.warning("LOGIN FAILED wrong credentials ip=%s", request.remote_addr)
                return error_response("Nomor HP / Email atau password salah", 401)
            log.error("LOGIN PB_ERROR ip=%s status=%s", request.remote_addr, e.response.status_code)
            return error_response(f"PocketBase error ({e.response.status_code})", 502)
        except Exception as e:
            log.error("LOGIN ERROR ip=%s %s", request.remote_addr, str(e))
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
            log.error("APPROVE FAILED tagihan=%s pb_error_code=%s", tagihan_id, status)
            return error_response(f"PocketBase error ({status}): {msg}", 502 if status >= 500 else 400)
        except Exception as e:
            log.error("APPROVE ERROR tagihan=%s %s", tagihan_id, str(e))
            return error_response(str(e), 500)


# ── Tagihan Tambah Lampiran (dari halaman Tagihan) ──

tagihan_lampiran_upload_response = api.model("TagihanLampiranUploadResponse", {
    "success": fields.Boolean,
    "lampiran_id": fields.String(description="ID record lampiran"),
    "message": fields.String,
})

tagihan_lampiran_upload_parser = reqparse.RequestParser(bundle_errors=True)
tagihan_lampiran_upload_parser.add_argument(
    "tagihan_id", type=str, required=True,
    location="form",
    help="ID tagihan",
)
tagihan_lampiran_upload_parser.add_argument(
    "file_bukti", type=type(open), required=True,
    location="files",
    help="File bukti pembayaran (Gambar/PDF, max ~10MB)",
)


@tagihan_ns.route("/tambah-lampiran")
class TagihanTambahLampiran(Resource):
    @tagihan_ns.expect(tagihan_lampiran_upload_parser)
    @tagihan_ns.response(200, "Berhasil", tagihan_lampiran_upload_response)
    @tagihan_ns.response(400, "Request tidak valid")
    @tagihan_ns.response(401, "Token tidak valid")
    @tagihan_ns.response(502, "PocketBase error")
    def post(self):
        """Upload lampiran untuk tagihan tertentu (1-to-1 dengan iuran tagihan).

        Menerima multipart/form-data:
        - tagihan_id (string): ID tagihan
        - file_bukti (file): Gambar/PDF

        Membuat lampiran + update tagihan (link lampiran + status Menunggu Konfirmasi).
        Header: Authorization = token pengurus
        """
        token = request.headers.get("Authorization", "")
        if not token:
            return error_response("Header Authorization diperlukan", 401)

        tagihan_id = request.form.get("tagihan_id", "").strip()
        file = request.files.get("file_bukti")

        client_ip = request.remote_addr or "unknown"

        if not tagihan_id:
            return error_response("tagihan_id diperlukan", 400)
        if not file:
            return error_response("file_bukti diperlukan", 400)

        try:
            # 1. Ambil data tagihan (expand iuran + warga)
            tagihan = pb_get(f"collections/tagihan/records/{tagihan_id}", token, expand="iuran,warga")
            warga_id = tagihan.get("warga")
            iuran_id = tagihan.get("iuran")
            iuran_data = (tagihan.get("expand") or {}).get("iuran") or {}
            warga_data = (tagihan.get("expand") or {}).get("warga") or {}

            if not warga_id or not iuran_id:
                return error_response("Tagihan tidak memiliki warga atau iuran", 400)

            no_rumah = warga_data.get("no_rumah", "")

            log.info(
                "TAMBAH_LAMPIRAN tagihan=%s warga=%s iuran=%s file=%s ip=%s",
                tagihan_id, warga_id, iuran_id, file.filename, client_ip,
            )

            # 2. Generate ID lampiran
            lampiran_id = _generate_id()

            # 3. Upload file → create lampiran
            pb_form = [
                ("id", lampiran_id),
                ("warga", warga_id),
                ("iuran", iuran_id),
                ("approval", "false"),
            ]
            pb_files = {"file_bukti": (file.filename, file.stream, file.content_type)}

            headers = {"Authorization": token}
            r = requests.post(
                f"{PB_URL}/api/collections/lampiran/records",
                headers=headers,
                data=pb_form,
                files=pb_files,
            )
            r.raise_for_status()

            # 4. Update tagihan: link lampiran + set status menunggu konfirmasi
            pb_patch(f"collections/tagihan/records/{tagihan_id}", token, {
                "lampiran": lampiran_id,
                "status_pembayaran": "Menunggu Konfirmasi",
            })

            # 5. Catat log aktivitas
            kode_iuran = iuran_data.get("kode", iuran_id)
            log_detail = (
                f"Tujuan Koleksi: lampiran\n"
                f"ID Record: {lampiran_id}\n"
                f"Oleh: Pengurus untuk Warga {no_rumah}\n"
                f"Waktu: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"Keterangan: Iuran {kode_iuran} (via tambah lampiran tagihan)"
            )
            try:
                pb_post("collections/aktivitas_warga/records", token, {
                    "warga": warga_id,
                    "aktivitas": "Upload Bukti Pembayaran (oleh Pengurus)",
                    "detail": log_detail,
                })
            except requests.HTTPError:
                pass

            log.info(
                "TAMBAH_LAMPIRAN SUCCESS tagihan=%s lampiran=%s file=%s",
                tagihan_id, lampiran_id, file.filename,
            )
            return {
                "success": True,
                "lampiran_id": lampiran_id,
                "message": "Lampiran berhasil ditambahkan",
            }, 200

        except requests.HTTPError as e:
            status = e.response.status_code
            msg = e.response.text[:200]
            log.error("TAMBAH_LAMPIRAN FAILED tagihan=%s pb_error=%s", tagihan_id, status)
            return error_response(f"PocketBase error ({status}): {msg}", 502 if status >= 500 else 400)
        except Exception as e:
            log.error("TAMBAH_LAMPIRAN ERROR tagihan=%s %s", tagihan_id, str(e))
            return error_response(str(e), 500)


# ── Iuran Upload Bukti ────────────────────────────

iuran_available_response = api.model("IuranAvailableResponse", {
    "success": fields.Boolean,
    "items": fields.List(fields.Nested(api.model("IuranItem", {
        "id": fields.String,
        "kode": fields.String,
        "nominal": fields.Float,
        "keterangan": fields.String(description="Deskripsi iuran"),
        "jatuh_tempo": fields.String(description="ISO date"),
    }))),
    "total": fields.Integer,
    "message": fields.String,
})

iuran_upload_response = api.model("IuranUploadResponse", {
    "success": fields.Boolean,
    "lampiran_id": fields.String(description="ID record lampiran"),
    "tagihan_count": fields.Integer(description="Jumlah tagihan dibuat/diupdate"),
    "message": fields.String,
})


def _generate_id() -> str:
    """Generate 15-char alphanumeric ID untuk PocketBase."""
    import random
    import string
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choices(chars, k=15))


@iuran_ns.route("/available")
class IuranAvailable(Resource):
    @iuran_ns.doc(params={
        "warga_id": {
            "description": "ID warga",
            "type": "string",
            "required": True,
            "in": "query",
        },
    })
    @iuran_ns.response(200, "Berhasil", iuran_available_response)
    @iuran_ns.response(400, "Request tidak valid")
    @iuran_ns.response(401, "Token tidak valid")
    @iuran_ns.response(502, "PocketBase error")
    def get(self):
        """Daftar iuran tersedia (belum dibayar) untuk warga.

        Filter otomatis iuran yg sudah punya tagihan (status apa pun).
        Header: Authorization = token user

        ### Contoh response:
        ```json
        {
          "success": true,
          "items": [
            {
              "id": "iuran01",
              "kode": "IPL-06-26",
              "nominal": 170000,
              "keterangan": "Iuran Juni 2026",
              "jatuh_tempo": "2026-06-20T00:00:00.000Z"
            }
          ],
          "total": 1,
          "message": "1 iuran tersedia"
        }
        ```
        """
        token = request.headers.get("Authorization", "")
        if not token:
            return error_response("Header Authorization diperlukan", 401)

        warga_id = request.args.get("warga_id", "").strip()
        if not warga_id:
            return error_response("warga_id diperlukan", 400)

        try:
            # 1. Ambil semua iuran
            all_iuran = pb_get(
                "collections/iuran/records",
                token,
                sort="kode",
                perPage=200,
            )
            iuran_items = all_iuran.get("items", [])

            # 2. Ambil tagihan existing warga ini
            existing_tagihan = pb_get(
                "collections/tagihan/records",
                token,
                filter=f'warga="{warga_id}"',
                perPage=200,
            )
            tagihan_items = existing_tagihan.get("items", [])

            # 3. Filter: skip iuran yg sdh ada tagihan (status apa pun)
            paid_iuran_ids = set(
                t["iuran"] for t in tagihan_items
                if t.get("iuran")
            )

            available = [
                i for i in iuran_items
                if i["id"] not in paid_iuran_ids
            ]

            log.info(
                "IURAN_AVAILABLE warga=%s total=%d available=%d",
                warga_id, len(iuran_items), len(available),
            )

            return {
                "success": True,
                "items": available,
                "total": len(available),
                "message": f"{len(available)} iuran tersedia",
            }, 200

        except requests.HTTPError as e:
            status = e.response.status_code
            msg = e.response.text[:200]
            log.error("IURAN_AVAILABLE FAILED warga=%s pb_error=%s", warga_id, status)
            return error_response(f"PocketBase error ({status}): {msg}", 502 if status >= 500 else 400)
        except Exception as e:
            log.error("IURAN_AVAILABLE ERROR warga=%s %s", warga_id, str(e))
            return error_response(str(e), 500)


@iuran_ns.route("/upload-bukti")
class IuranUploadBukti(Resource):
    @iuran_ns.expect(upload_parser)
    @iuran_ns.response(200, "Berhasil", iuran_upload_response)
    @iuran_ns.response(400, "Request tidak valid")
    @iuran_ns.response(401, "Token tidak valid")
    @iuran_ns.response(502, "PocketBase error")
    def post(self):
        """Upload bukti pembayaran iuran.

        Menerima multipart/form-data:
        - warga_id (string): ID warga
        - iuran_ids[] (array): satu atau lebih ID iuran
        - file_bukti (file): Gambar/PDF

        Membuat/update lampiran + tagihan + log aktivitas.
        Header: Authorization = token user

        ### 🔍 Contoh (gunakan Swagger "Try it out"):
        **warga_id**: `9wu3x7k2m1n4v5p6`  
        **iuran_ids[]**: `8abc123def456gh` (kirim 1 atau lebih)  
        **file_bukti**: pilih file gambar/PDF  

        **Response success:**
        ```json
        {
          "success": true,
          "lampiran_id": "m2n5b7k9x1w3p4q6",
          "tagihan_count": 2,
          "message": "Bukti pembayaran berhasil diupload"
        }
        ```
        """
        token = request.headers.get("Authorization", "")
        if not token:
            log.warning("UPLOAD REJECTED: no Authorization header")
            return error_response("Header Authorization diperlukan", 401)

        warga_id = request.form.get("warga_id", "").strip()
        iuran_ids = request.form.getlist("iuran_ids[]")
        file = request.files.get("file_bukti")

        # ── Log incoming request ──
        client_ip = request.remote_addr or "unknown"
        user_agent = request.headers.get("User-Agent", "unknown")[:120]
        log.info(
            "UPLOAD INCOMING ip=%s ua=%s warga=%s iuran=%s file=%s size=%s type=%s",
            client_ip, user_agent, warga_id, iuran_ids,
            file.filename if file else "NONE",
            file.content_length if file and file.content_length else "?",
            file.content_type if file else "NONE",
        )

        if not warga_id:
            log.warning("UPLOAD REJECTED: missing warga_id ip=%s", client_ip)
            return error_response("warga_id diperlukan", 400)
        if not iuran_ids:
            log.warning("UPLOAD REJECTED: missing iuran_ids[] ip=%s warga=%s", client_ip, warga_id)
            return error_response("iuran_ids[] diperlukan", 400)
        if not file:
            log.warning("UPLOAD REJECTED: missing file_bukti ip=%s warga=%s", client_ip, warga_id)
            return error_response("file_bukti diperlukan", 400)

        try:
            # ── CEK DUPLIKAT: iuran yg sudah ada tagihan (pending/lunas) ──
            existing_tagihan = pb_get(
                "collections/tagihan/records",
                token,
                filter=f'warga="{warga_id}"',
                perPage=200,
            )
            existing_items = existing_tagihan.get("items", [])
            paid_iuran_ids = set(
                t["iuran"] for t in existing_items
                if t.get("iuran") and t.get("status_pembayaran") in ("Menunggu Konfirmasi", "Lunas")
            )

            # Filter iuran_ids: skip yg sudah ada tagihan lunas/pending
            filtered_iuran_ids = [iid for iid in iuran_ids if iid not in paid_iuran_ids]
            skipped_ids = [iid for iid in iuran_ids if iid in paid_iuran_ids]

            if not filtered_iuran_ids:
                log.warning(
                    "UPLOAD REJECTED all iuran already paid ip=%s warga=%s iuran=%s",
                    client_ip, warga_id, iuran_ids,
                )
                return error_response(
                    "Semua iuran yang dipilih sudah memiliki tagihan (lunas/menunggu konfirmasi)",
                    400,
                )

            if skipped_ids:
                log.info(
                    "UPLOAD skip paid iuran ip=%s warga=%s skipped=%s",
                    client_ip, warga_id, skipped_ids,
                )

            # 1. Ambil data warga untuk no_rumah
            warga = pb_get(f"collections/warga/records/{warga_id}", token)
            no_rumah = warga.get("no_rumah", "")
            log.info("UPLOAD warga data no_rumah=%s id=%s", no_rumah, warga_id)

            # 2. Dapatkan daftar iuran untuk nominal & kode
            iuran_map = {}
            for iid in iuran_ids:
                try:
                    i = pb_get(f"collections/iuran/records/{iid}", token)
                    iuran_map[iid] = i
                except requests.HTTPError:
                    pass  # skip invalid iuran

            # 3. Generate ID lampiran
            lampiran_id = _generate_id()

            # 4. Upload file → create lampiran
            # PB accepts repeated form keys for relations
            pb_form = [("id", lampiran_id), ("warga", warga_id), ("approval", "false")]
            for iid in filtered_iuran_ids:
                pb_form.append(("iuran", iid))

            pb_files = {"file_bukti": (file.filename, file.stream, file.content_type)}

            # Forward to PocketBase
            headers = {"Authorization": token}
            r = requests.post(
                f"{PB_URL}/api/collections/lampiran/records",
                headers=headers,
                data=pb_form,
                files=pb_files,
            )
            r.raise_for_status()

            # 5. Loop tiap iuran → cari/buat tagihan, link lampiran
            tagihan_count = 0
            for iuran_id in filtered_iuran_ids:
                iuran_data = iuran_map.get(iuran_id, {})
                nominal = iuran_data.get("nominal", 0)
                jatuh_tempo = iuran_data.get("jatuh_tempo", "")

                # Cari tagihan existing
                existing = pb_get(
                    "collections/tagihan/records",
                    token,
                    filter=f'warga="{warga_id}" && iuran="{iuran_id}"',
                    perPage=1,
                )
                existing_items = existing.get("items", [])

                if existing_items:
                    # Update existing tagihan
                    tag = existing_items[0]
                    pb_patch(f"collections/tagihan/records/{tag['id']}", token, {
                        "lampiran": lampiran_id,
                        "status_pembayaran": "Menunggu Konfirmasi",
                    })
                else:
                    # Buat tagihan baru — biarkan PB auto-generate ID
                    pb_post("collections/tagihan/records", token, {
                        "warga": warga_id,
                        "iuran": iuran_id,
                        "nominal": nominal,
                        "jatuh_tempo": jatuh_tempo or datetime.now(timezone.utc).isoformat(),
                        "status_pembayaran": "Menunggu Konfirmasi",
                        "lampiran": lampiran_id,
                    })
                tagihan_count += 1

            # 6. Catat log aktivitas
            iuran_codes = []
            for iid in filtered_iuran_ids:
                i = iuran_map.get(iid, {})
                iuran_codes.append(i.get("kode", iid))

            log_detail = (
                f"Tujuan Koleksi: lampiran\n"
                f"ID Record: {lampiran_id}\n"
                f"Oleh: Warga {no_rumah}\n"
                f"Waktu: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"Keterangan: Iuran {', '.join(iuran_codes)}"
            )

            try:
                pb_post("collections/aktivitas_warga/records", token, {
                    "warga": warga_id,
                    "aktivitas": "Upload Bukti Pembayaran",
                    "detail": log_detail,
                })
            except requests.HTTPError:
                pass  # log gagal bukan fatal

            log.info(
                "UPLOAD SUCCESS ip=%s warga=%s no_rumah=%s iuran=%s lampiran=%s file=%s tagihan_count=%s skipped=%s",
                client_ip, warga_id, no_rumah, filtered_iuran_ids, lampiran_id,
                file.filename, tagihan_count, skipped_ids,
            )
            return {
                "success": True,
                "lampiran_id": lampiran_id,
                "tagihan_count": tagihan_count,
                "message": "Bukti pembayaran berhasil diupload",
            }, 200

        except requests.HTTPError as e:
            status = e.response.status_code
            msg = e.response.text[:200]
            log.error("UPLOAD FAILED ip=%s warga=%s iuran=%s file=%s pb_error_code=%s pb_msg=%s",
                      client_ip, warga_id, iuran_ids, file.filename, status, msg)
            return error_response(f"PocketBase error ({status}): {msg}", 502 if status >= 500 else 400)
        except Exception as e:
            log.error("UPLOAD FAILED ip=%s warga=%s iuran=%s file=%s error=%s",
                      client_ip, warga_id, iuran_ids, file.filename, str(e))
            return error_response(str(e), 500)


@tagihan_ns.route("/generate")
@tagihan_ns.route("/generate/<path:iuran_id>")
@tagihan_ns.route("/generate/<path:iuran_id>/<path:warga_id>")
class TagihanGenerate(Resource):
    @tagihan_ns.doc(params={
        "iuran_id": {
            "description": "ID iuran. Kosongkan → auto-detect bulan ini",
            "type": "string",
            "required": False,
        },
        "warga_id": {
            "description": "ID warga. Kosongkan → semua warga",
            "type": "string",
            "required": False,
        },
    })
    @tagihan_ns.response(200, "Berhasil")
    @tagihan_ns.response(400, "Request tidak valid")
    @tagihan_ns.response(401, "Token tidak valid")
    @tagihan_ns.response(502, "PocketBase error")
    def post(self, iuran_id=None, warga_id=None):
        """Generate tagihan untuk warga aktif.

        **3 cara panggil (semua POST):**

        ---
        **1. Auto – semua iuran bulan ini + semua warga**
        ```
        POST /v1/tagihan/generate
        ```
        Cari iuran dgn `jatuh_tempo` bulan berjalan, generate tagihan untuk semua warga.

        ---
        **2. Iuran tertentu + semua warga**
        ```
        POST /v1/tagihan/generate/IURAN_ID
        ```
        Contoh: `POST /v1/tagihan/generate/abc123def456`

        ---
        **3. Iuran tertentu + warga tertentu**
        ```
        POST /v1/tagihan/generate/IURAN_ID/WARGA_ID
        ```
        Contoh: `POST /v1/tagihan/generate/abc123def456/xyz789uvw`

        ---
        **Response:**
        ```json
        {
          "success": true,
          "total_created": 10,
          "total_skipped": 2,
          "total_errors": 0,
          "created": [{"warga":"...","iuran":"...","nominal":50000}],
          "skipped": [{"warga":"...","iuran":"...","reason":"duplicate"}],
          "errors": []
        }
        ```

        Header: **Authorization: &lt;token&gt;** (token superuser/pengurus)
        """
        token = request.headers.get("Authorization", "")
        if not token:
            return error_response("Header Authorization diperlukan", 401)

        try:
            now = datetime.now(timezone.utc)
            month_prefix = now.strftime("%Y-%m")  # "2026-06"

            # ── 1. Tentukan iuran ──
            iuran_list = []
            if iuran_id:
                # single iuran by ID
                iuran = pb_get(f"collections/iuran/records/{iuran_id}", token)
                iuran_list = [iuran]
            else:
                # cari iuran where jatuh_tempo starts with YYYY-MM
                # filter: jatuh_tempo~'2026-06'
                result = pb_get(
                    "collections/iuran/records",
                    token,
                    filter=f'jatuh_tempo~"{month_prefix}"',
                )
                iuran_list = result.get("items", [])

            if not iuran_list:
                return error_response(
                    f"Iuran tidak ditemukan" +
                    (f" (id: {iuran_id})" if iuran_id else f" untuk bulan {month_prefix}"),
                    400,
                )

            # ── 2. Tentukan warga ──
            warga_list = []
            if warga_id:
                warga = pb_get(f"collections/warga/records/{warga_id}", token)
                warga_list = [warga]
            else:
                result = pb_get(
                    "collections/warga/records",
                    token,
                    sort="no_rumah",
                    perPage=200,
                )
                # Semua warga dianggap aktif (tidak ada kolom is_active)
                warga_list = result.get("items", [])

            if not warga_list:
                return error_response(
                    f"Warga tidak ditemukan" +
                    (f" (id: {warga_id})" if warga_id else ""),
                    400,
                )

            # ── 3. Generate tagihan ──
            created = []
            skipped = []
            errors = []

            for iuran in iuran_list:
                iuran_id_val = iuran["id"]
                nominal = iuran.get("nominal", 0)
                jatuh_tempo = iuran.get("jatuh_tempo", "")

                for warga in warga_list:
                    warga_id_val = warga["id"]

                    # Cek duplikat: sudah ada tagihan dengan warga+iuran yg sama
                    existing = pb_get(
                        "collections/tagihan/records",
                        token,
                        filter=f'warga="{warga_id_val}" && iuran="{iuran_id_val}"',
                        perPage=1,
                    )
                    if existing.get("totalItems", 0) > 0:
                        skipped.append({
                            "warga": warga_id_val,
                            "iuran": iuran_id_val,
                            "reason": "duplicate",
                        })
                        continue

                    # Buat tagihan baru — biarkan PB auto-generate ID
                    try:
                        pb_post("collections/tagihan/records", token, {
                            "warga": warga_id_val,
                            "iuran": iuran_id_val,
                            "nominal": nominal,
                            "jatuh_tempo": jatuh_tempo,
                            "status_pembayaran": "Belum Dibayar",
                        })
                        created.append({
                            "warga": warga_id_val,
                            "iuran": iuran_id_val,
                            "nominal": nominal,
                        })
                    except requests.HTTPError as e:
                        errors.append({
                            "warga": warga_id_val,
                            "iuran": iuran_id_val,
                            "error": e.response.text[:150],
                        })

            return {
                "success": True,
                "total_created": len(created),
                "total_skipped": len(skipped),
                "total_errors": len(errors),
                "created": created,
                "skipped": skipped,
                "errors": errors,
            }, 200

        except requests.HTTPError as e:
            status = e.response.status_code
            msg = e.response.text[:200]
            log.error("GENERATE FAILED iuran=%s warga=%s pb_error_code=%s", iuran_id, warga_id or "all", status)
            return error_response(f"PocketBase error ({status}): {msg}", 502 if status >= 500 else 400)
        except Exception as e:
            log.error("GENERATE ERROR iuran=%s warga=%s %s", iuran_id, warga_id or "all", str(e))
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
    log.info("Kas Warga API starting on port 8888, PB_URL=%s", PB_URL)
    app.run(host="0.0.0.0", port=8888, debug=True)
