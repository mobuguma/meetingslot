/**
 * Prisma Studio 역방향 프록시
 *
 * 문제: 프록시 환경(예: /proxy/51213/)에서 Prisma Studio를 열면
 * HTML 내부의 절대 경로(/ui/index.css, /bff 등)가 프록시 prefix 없이
 * 해석되어 리소스 로딩에 실패함.
 *
 * 해결: 이 프록시 서버가 HTML 응답을 가로채서 절대 경로에
 * 프록시 prefix를 붙여 재작성함.
 */

import http from 'http';

// Prisma Studio가 실행 중인 포트
const STUDIO_PORT = 51212;
// 이 프록시가 Listen할 포트 (외부에서 접근)
const PROXY_PORT = 51213;

const PROXY_PREFIX = `/proxy/${PROXY_PORT}`;

const proxy = http.createServer((req, res) => {
  // 브라우저가 /proxy/51213/adapter.js 로 요청하면
  // Prisma Studio에는 /adapter.js 로 전달 (prefix 제거)
  const studioPath = req.url.startsWith(PROXY_PREFIX)
    ? req.url.slice(PROXY_PREFIX.length) || '/'
    : req.url;

  const options = {
    hostname: 'localhost',
    port: STUDIO_PORT,
    path: studioPath,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] || '';

    const isHtml = contentType.includes('text/html');
    const isJs = contentType.includes('javascript');

    // HTML과 JS 응답 모두 절대 경로 재작성 필요
    // (JS 파일 내부에도 from '/...' 형태의 절대 경로 import가 있음)
    if (isHtml || isJs) {
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => {
        const PREFIX = `/proxy/${PROXY_PORT}`;
        let rewritten = body
          // import/export ... from '/...' (ES module)
          .replace(/from '\/(?!\/)/g, `from '${PREFIX}/`)
          .replace(/from "\/(?!\/)/g, `from "${PREFIX}/`);

        if (isHtml) {
          // HTML 전용: href, src 속성 및 fetch 호출
          rewritten = rewritten
            .replace(/(href|src)="\//g, `$1="${PREFIX}/`)
            .replace(/fetch\('\/(?!\/)/g, `fetch('${PREFIX}/`)
            .replace(/fetch\("\/(?!\/)/g, `fetch("${PREFIX}/`)
            .replace(/url: '\/bff'/g, `url: '${PREFIX}/bff'`)
            .replace(/url:"\/bff"/g, `url:"${PREFIX}/bff"`);
        }

        const responseHeaders = { ...proxyRes.headers };
        responseHeaders['content-length'] = Buffer.byteLength(rewritten, 'utf8');
        delete responseHeaders['content-encoding'];

        res.writeHead(proxyRes.statusCode, responseHeaders);
        res.end(rewritten);
      });
    } else {
      // CSS, 이미지 등 나머지는 그대로 전달
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end(`Prisma Studio 연결 실패: ${err.message}`);
  });

  req.pipe(proxyReq);
});

proxy.listen(PROXY_PORT, () => {
  console.log(`프록시 실행 중: http://localhost:${PROXY_PORT}`);
  console.log(`Prisma Studio 원본: http://localhost:${STUDIO_PORT}`);
  console.log(`접속 URL: https://code.wonjin.dedyn.io/proxy/${PROXY_PORT}/`);
});
