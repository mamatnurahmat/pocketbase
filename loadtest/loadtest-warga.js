/**
 * Load Test: Semua Warga Login & Get Data Bersamaan
 *
 * Simulasi seluruh warga:
 *   1. Login (auth-with-password)
 *   2. GET /collections/warga/records?expand=user,status
 *   3. GET /collections/warga/records/:id?expand=user,status
 *
 * Berjalan selama 1 menit secara bersamaan.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ── Data Warga ──────────────────────────────────────────────────────────────
const wargaAccounts = new SharedArray('warga', function () {
  const data = JSON.parse(open('./warga-accounts.json'));
  return data;
});

// ── Konfigurasi ─────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://prestige2.sawangan.web.id/api';
const TARGET_VUS = __ENV.TARGET_VUS
  ? parseInt(__ENV.TARGET_VUS)
  : Math.min(wargaAccounts.length, 40);
const DURATION_SECONDS = __ENV.DURATION || '60';

// ── Custom Metrics ──────────────────────────────────────────────────────────
const loginDuration = new Trend('login_duration', true);
const getWargaListDuration = new Trend('get_warga_list_duration', true);
const getWargaDetailDuration = new Trend('get_warga_detail_duration', true);
const loginSuccessRate = new Rate('login_success_rate');
const wargaDataSuccessRate = new Rate('warga_data_success_rate');

// ── k6 Options ──────────────────────────────────────────────────────────────
export const options = {
  // Secara bersamaan seluruh VU melakukan login + get data
  scenarios: {
    semua_warga_login_dan_get_data: {
      executor: 'constant-vus',
      vus: TARGET_VUS,
      duration: `${DURATION_SECONDS}s`,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],   // 95% request < 5 detik
    http_req_failed: ['rate<0.20'],       // < 20% error rate
    login_success_rate: ['rate>0.80'],     // > 80% login sukses
    warga_data_success_rate: ['rate>0.80'], // > 80% get data sukses
  },
  summaryTrendStats: [
    'avg', 'min', 'med', 'max',
    'p(50)', 'p(90)', 'p(95)', 'p(99)',
  ],
};

// ── Helper ──────────────────────────────────────────────────────────────────
function getWargaForVU(vuId) {
  // Setiap VU mendapat warga berbeda (round-robin)
  const index = (vuId - 1) % wargaAccounts.length;
  return wargaAccounts[index];
}

// ── Main Test ───────────────────────────────────────────────────────────────
export default function () {
  const vuId = __VU;
  const warga = getWargaForVU(vuId);

  // ─── Step 1: Login ───────────────────────────────────────────────────
  let token = null;
  let wargaRecord = null;

  const loginRes = group('01-login', function () {
    const body = JSON.stringify({
      identity: warga.email,
      password: warga.password,
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /auth-with-password' },
    };

    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/collections/users/auth-with-password`,
      body,
      params
    );
    loginDuration.add(Date.now() - start);

    const ok = check(res, {
      'login status 200': (r) => r.status === 200,
      'login punya token': (r) => r.json('token') !== undefined && r.json('token') !== '',
      'login punya record.id': (r) => r.json('record.id') !== undefined,
    });

    loginSuccessRate.add(ok);

    if (ok) {
      token = res.json('token');
      wargaRecord = res.json('record');
    }
  });

  // Jika login gagal, skip sisa request
  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  // ─── Step 2: GET List Warga (dengan expand user & status) ────────────
  group('02-get-warga-list', function () {
    const params = {
      headers: authHeaders.headers,
      tags: { name: 'GET /warga/records (list)' },
    };

    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/collections/warga/records?expand=user,status&perPage=50&page=1`,
      params
    );
    getWargaListDuration.add(Date.now() - start);

    const ok = check(res, {
      'list warga status 200': (r) => r.status === 200,
      'list warga punya items': (r) => Array.isArray(r.json('items')),
      'list warga totalItems > 0': (r) => r.json('totalItems') > 0,
    });

    wargaDataSuccessRate.add(ok);
  });

  // ─── Step 3: GET Detail Warga Sendiri ────────────────────────────────
  group('03-get-warga-detail', function () {
    // Cari ID warga milik sendiri dari list, atau gunakan data dari user record
    // Alternatif: coba filter warga berdasarkan user ID
    const params = {
      headers: authHeaders.headers,
      tags: { name: 'GET /warga/records (detail sendiri)' },
    };

    // Filter warga berdasarkan user ID dari token
    const userId = wargaRecord ? wargaRecord.id : null;
    if (!userId) return;

    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/collections/warga/records?filter=user%3D%22${userId}%22&expand=user,status&perPage=1`,
      params
    );
    getWargaDetailDuration.add(Date.now() - start);

    const ok = check(res, {
      'detail warga status 200': (r) => r.status === 200,
      'detail warga items ada': (r) => r.json('totalItems') >= 1,
      'detail no_rumah ada': (r) => {
        const items = r.json('items');
        return items && items.length > 0 && items[0].no_rumah !== undefined;
      },
    });

    wargaDataSuccessRate.add(ok);
  });

  // Simulasi jeda natural sebelum iterasi berikutnya (dalam 1 menit)
  sleep(Math.random() * 2 + 1);
}

// ── Summary / Report Generator ──────────────────────────────────────────────
export function handleSummary(data) {
  const reportDir = __ENV.REPORT_DIR || './reports';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlFilename = `${reportDir}/loadtest-warga-${timestamp}.html`;
  const jsonFilename = `${reportDir}/loadtest-warga-${timestamp}.json`;

  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    [jsonFilename]: JSON.stringify(data, null, 2),
    [htmlFilename]: htmlReport(data),
  };
}