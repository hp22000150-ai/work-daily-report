/**
 * 작업일보 자동 빌드 스크립트
 * 실행: node build.mjs
 * - 현재 날짜+시간으로 버전 자동 생성
 * - PC(Electron) + Android(APK) 동시 빌드
 * - 결과물을 work-daily-report/ 폴더로 복사
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DOCS = path.join(ROOT, '..', 'construction-docs');
const APK_WWW = path.join(DOCS, '작업일보-apk', 'www');
const APK_ANDROID = path.join(DOCS, '작업일보-apk', 'android');
const GRADLE = path.join(APK_ANDROID, 'app', 'build.gradle');

// ── 버전 생성 ──────────────────────────────────────────
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const YY   = String(now.getFullYear()).slice(2);          // 26
const YYYY = String(now.getFullYear());                   // 2026
const MM   = pad(now.getMonth() + 1);                     // 06
const DD   = pad(now.getDate());                          // 12
const HH   = pad(now.getHours());                         // 18
const NN   = pad(now.getMinutes());                       // 40

const displayVer  = `${YY}${MM}${DD}.${HH}${NN}`;        // 앱 표시: 260612.1840
const semVer      = `${YY}.${parseInt(MM+DD)}.${HH}${NN}`; // package.json: 26.612.1840
const versionCode = parseInt(`${YY}${MM}${DD}${HH}`);    // Android: 26061218
const apkFile     = `작업일보_${YYYY}${MM}${DD}_${HH}${NN}.apk`;
const tag         = `${YYYY}${MM}${DD}_${HH}${NN}`;

console.log(`\n빌드 버전: ${displayVer}  (semver: ${semVer})`);

// ── 파일 내용 치환 헬퍼 ──────────────────────────────
function patch(filePath, ...pairs) {
  let src = readFileSync(filePath, 'utf8');
  for (const [from, to] of pairs) {
    const found = from instanceof RegExp ? from.test(src) : src.includes(from);
    if (!found) console.warn(`  ⚠ 패턴 미발견: ${String(from).slice(0, 60)}`);
    src = src.replace(from, to);
  }
  writeFileSync(filePath, src, 'utf8');
  console.log(`  ✓ ${path.relative(ROOT, filePath)}`);
}

// ── 버전 업데이트 ─────────────────────────────────────
console.log('\n[1] 버전 업데이트');

// mobile.html — 헤더 표시 버전
patch(path.join(ROOT, 'mobile.html'),
  [/V \d{6,8}\.\d{4}|V \d+\.\d+\.\d+/, `V ${displayVer}`]
);

// index.html — PC 헤더 표시 버전
patch(path.join(ROOT, 'index.html'),
  [/V \d{6,8}\.\d{4}|V \d+\.\d+\.\d+/, `V ${displayVer}`]
);

// work-daily-report/package.json
patch(path.join(ROOT, 'package.json'),
  [/"version": "[^"]+"/, `"version": "${semVer}"`]
);

// construction-docs/package.json
patch(path.join(DOCS, 'package.json'),
  [/"version": "[^"]+"/, `"version": "${semVer}"`]
);

// build.gradle
patch(GRADLE,
  [/versionCode \d+/, `versionCode ${versionCode}`],
  [/versionName "[^"]+"/, `versionName "${displayVer}"`],
  [/outputFileName = "[^"]+"/, `outputFileName = "${apkFile}"`]
);

// ── 파일 복사 ─────────────────────────────────────────
console.log('\n[2] 소스 파일 복사');

for (const f of ['mobile.html', 'index.html']) {
  const src = path.join(ROOT, f);
  copyFileSync(src, path.join(DOCS, f));
  console.log(`  ✓ → construction-docs/${f}`);
}
// report.html은 construction-docs에서만 관리 (버전 표시 없음)
const reportSrc = path.join(DOCS, 'report.html');
if (existsSync(reportSrc)) console.log(`  ✓ construction-docs/report.html (수정본 유지)`);
// Capacitor 앱은 www/index.html을 로드 → mobile.html을 index.html로 복사
copyFileSync(path.join(ROOT, 'mobile.html'), path.join(APK_WWW, 'index.html'));
console.log(`  ✓ → 작업일보-apk/www/index.html  ← Capacitor 진입점`);
copyFileSync(path.join(ROOT, 'mobile.html'), path.join(APK_WWW, 'mobile.html'));
console.log(`  ✓ → 작업일보-apk/www/mobile.html`);
copyFileSync(path.join(ROOT, 'manifest.json'), path.join(APK_WWW, 'manifest.json'));
console.log(`  ✓ → 작업일보-apk/www/manifest.json`);

// ── PC 빌드 ───────────────────────────────────────────
console.log('\n[3] PC(Electron) 빌드');
execSync('npm run build', { cwd: DOCS, stdio: 'inherit' });

// ── Android 빌드 ──────────────────────────────────────
console.log('\n[4] Android 캐패시터 동기화');
execSync('npx cap sync android', { cwd: path.join(DOCS, '작업일보-apk'), stdio: 'inherit' });

console.log('\n[5] APK 빌드');
const javaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const env = { ...process.env, JAVA_HOME: javaHome, PATH: `${javaHome}\\bin;${process.env.PATH}` };
execSync('.\\gradlew.bat assembleDebug', { cwd: APK_ANDROID, stdio: 'inherit', env });

// ── 결과물 복사 ───────────────────────────────────────
console.log('\n[6] 결과물 복사 → work-daily-report/');

const exeName = `작업일보 Setup ${semVer}.exe`;
const exeSrc  = path.join(DOCS, 'dist', exeName);
if (existsSync(exeSrc)) {
  copyFileSync(exeSrc, path.join(ROOT, exeName));
  console.log(`  ✓ ${exeName}`);
} else {
  console.warn(`  ⚠ EXE 없음: ${exeName}`);
}

const apkDebugDir = path.join(APK_ANDROID, 'app', 'build', 'outputs', 'apk', 'debug');
const apkSrc = path.join(apkDebugDir, apkFile);
if (existsSync(apkSrc)) {
  copyFileSync(apkSrc, path.join(ROOT, apkFile));
  console.log(`  ✓ ${apkFile}`);
} else {
  // 이름이 다를 경우 폴더에서 첫 APK 찾기
  const { readdirSync } = await import('fs');
  const found = readdirSync(apkDebugDir).find(f => f.endsWith('.apk'));
  if (found) {
    copyFileSync(path.join(apkDebugDir, found), path.join(ROOT, apkFile));
    console.log(`  ✓ ${found} → ${apkFile}`);
  } else {
    console.warn(`  ⚠ APK 없음`);
  }
}

console.log(`\n✅ 빌드 완료: ${displayVer}\n`);
