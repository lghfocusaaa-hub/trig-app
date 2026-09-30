/* ============================================================
   三角函数解析图 · 交互逻辑
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const TAU = Math.PI * 2;
  const fmt = (n, d = 3) => {
    if (!isFinite(n)) return '∞';
    return Number(n.toFixed(d)).toString();
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- 主题切换 ---------- */
  function initTheme() {
    const html = document.documentElement;
    const toggle = $('#theme-toggle');
    const iconSun = $('#icon-sun');
    const iconMoon = $('#icon-moon');
    const saved = localStorage.getItem('tri-theme');
    if (saved) html.setAttribute('data-theme', saved);
    const apply = () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      iconSun.style.display = isDark ? 'inline' : 'none';
      iconMoon.style.display = isDark ? 'none' : 'inline';
    };
    apply();
    toggle.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('tri-theme', next);
      apply();
      // 重绘依赖主题色的视图
      drawCurves();
      if (currentView === 'circle') updateCircle();
    });
  }

  /* ---------- Tab 切换 ---------- */
  let currentView = 'diagram';
  function initTabs() {
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === currentView) return;
        $$('.tab-btn').forEach(b => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        $$('[data-view]').forEach(v => { v.hidden = v.dataset.view !== tab; });
        currentView = tab;
        // 切换后懒初始化
        if (tab === 'curves') drawCurves();
      });
    });
  }

  /* ---------- 重置按钮 ---------- */
  function initReset() {
    $('#reset-btn').addEventListener('click', () => {
      if (currentView === 'diagram') setTriangle(80, 80, 320, 320);
      else if (currentView === 'circle') setCircleAngle(0);
      else if (currentView === 'curves') { /* 无状态可重置 */ }
      else if (currentView === 'solver') clearSolver();
    });
  }

  /* ============================================================
     视图 1：可拖拽直角三角形
     ============================================================ */
  const triSVG = $('#triangle-svg');
  const triState = { Ax: 80, Ay: 80, Bx: 320, By: 320, Cx: 80, Cy: 320 };
  const TRI_SCALE = 80; // 80 SVG 单位 = 1 长度单位

  function getSvgPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function setTriangle(Ax, Ay, Bx, By) {
    // 约束：A 在 x=80 竖线上，B 在 y=320 横线上
    Ax = triState.Cx;
    Ay = clamp(Ay, 40, 305);
    Bx = clamp(Bx, 110, 400);
    By = triState.Cy;
    Object.assign(triState, { Ax, Ay, Bx, By });

    const { Cx, Cy } = triState;
    $('#tri-polygon').setAttribute('points', `${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`);
    $('#handle-A').setAttribute('cx', Ax);
    $('#handle-A').setAttribute('cy', Ay);
    $('#handle-B').setAttribute('cx', Bx);
    $('#handle-B').setAttribute('cy', By);

    // 直角标记（在 C 处，沿 CA 方向向上、沿 CB 方向向右）
    const size = 22;
    const upX = Cx, upY = Cy - size;
    const rightX = Cx + size, rightY = Cy;
    $('#right-angle').setAttribute('points', `${rightX},${Cy} ${rightX},${upY} ${Cx},${upY}`);
    $('#right-label').setAttribute('x', Cx + size/2 + 3);
    $('#right-label').setAttribute('y', Cy - size/2 - 3);

    // 顶点标签位置
    $('#label-A').setAttribute('x', Ax - 18);
    $('#label-A').setAttribute('y', Ay - 8);
    $('#label-B').setAttribute('x', Bx + 18);
    $('#label-B').setAttribute('y', By + 18);
    $('#label-C').setAttribute('x', Cx - 18);
    $('#label-C').setAttribute('y', Cy + 18);

    // 计算边长（长度单位）
    const a = (Bx - Cx) / TRI_SCALE;   // BC 水平边
    const b = (Cy - Ay) / TRI_SCALE;   // AC 竖直边
    const c = Math.hypot(a, b);
    const angleA = Math.atan2(a, b) * 180 / Math.PI; // ∠A 对边 a，邻边 b
    const angleB = 90 - angleA;

    // 边标签
    $('#label-b').setAttribute('x', Ax - 22);
    $('#label-b').setAttribute('y', (Ay + Cy) / 2);
    $('#label-a').setAttribute('x', (Bx + Cx) / 2);
    $('#label-a').setAttribute('y', By + 22);
    // 斜边 c 标签：放在 AB 中点偏向三角形内部
    const midX = (Ax + Bx) / 2, midY = (Ay + By) / 2;
    // 法向量（指向内部）
    const dx = Bx - Ax, dy = By - Ay;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    // 判断指向内部：C 应在法向正侧
    const sign = ((Cx - midX) * nx + (Cy - midY) * ny) > 0 ? 1 : -1;
    $('#label-c').setAttribute('x', midX + sign * nx * 18);
    $('#label-c').setAttribute('y', midY + sign * ny * 18 + 5);
    $('#len-b').setAttribute('x', Ax - 22);
    $('#len-b').setAttribute('y', (Ay + Cy) / 2 + 16);
    $('#len-a').setAttribute('x', (Bx + Cx) / 2);
    $('#len-a').setAttribute('y', By + 14);
    $('#len-c').setAttribute('x', midX + sign * nx * 18);
    $('#len-c').setAttribute('y', midY + sign * ny * 18 + 18);
    $('#len-a').textContent = fmt(a, 2);
    $('#len-b').textContent = fmt(b, 2);
    $('#len-c').textContent = fmt(c, 2);

    // 角度弧
    drawAngleArc($('#arc-A'), Ax, Ay, Bx, By, Cx, Cy, 'A');
    drawAngleArc($('#arc-B'), Bx, By, Ax, Ay, Cx, Cy, 'B');

    // 公式卡片更新
    $('#m-A').textContent = fmt(angleA, 1) + '°';
    $('#m-B').textContent = fmt(angleB, 1) + '°';
    $('#f-A-sum').textContent = fmt(angleA, 1) + '°';
    $('#f-B-sum').textContent = fmt(angleB, 1) + '°';
    $('#f-AB').textContent = fmt(angleA + angleB, 1) + '°';
    const sinA = a / c, cosA = b / c, tanA = a / b;
    const sinB = b / c, cosB = a / c, tanB = b / a;
    $('#f-sinA').textContent = fmt(sinA);
    $('#f-cosA').textContent = fmt(cosA);
    $('#f-tanA').textContent = fmt(tanA);
    $('#f-sinB').textContent = fmt(sinB);
    $('#f-cosB').textContent = fmt(cosB);
    $('#f-tanB').textContent = fmt(tanB);
    $('#f-a').textContent = fmt(a);
    $('#f-b').textContent = fmt(b);
    $('#f-c').textContent = fmt(c);
    $('#sum-ab').textContent = fmt(a * a + b * b, 2);
    $('#sum-c2').textContent = fmt(c * c, 2);
    $('#sum-angles').textContent = fmt(angleA + angleB + 90, 1) + '°';
  }

  function drawAngleArc(pathEl, Vx, Vy, OtherX, OtherY, Cx, Cy, which) {
    const r = 26;
    // 从 V 指向 Other 的方向，与 V 指向 C 的方向之间的夹角弧
    const v1x = OtherX - Vx, v1y = OtherY - Vy;
    const v2x = Cx - Vx, v2y = Cy - Vy;
    const n1 = Math.hypot(v1x, v1y), n2 = Math.hypot(v2x, v2y);
    const s1x = v1x / n1 * r, s1y = v1y / n1 * r;
    const s2x = v2x / n2 * r, s2y = v2y / n2 * r;
    // 起点用 V→Other 方向，终点用 V→C 方向
    const sx = Vx + s1x, sy = Vy + s1y;
    const ex = Vx + s2x, ey = Vy + s2y;
    pathEl.setAttribute('d', `M ${sx} ${sy} A ${r} ${r} 0 0 0 ${ex} ${ey}`);
  }

  function initTriangleDrag() {
    let dragging = null;
    let activeHandle = null;

    const start = (e) => {
      const target = e.target;
      if (target.classList && target.classList.contains('vertex-handle')) {
        dragging = target.dataset.vertex;
        activeHandle = target;
        // 捕获指针，确保拖动过程中事件持续送达本元素
        if (target.setPointerCapture) {
          try { target.setPointerCapture(e.pointerId); } catch (_) {}
        }
        e.preventDefault();
      }
    };
    const move = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const p = getSvgPoint(triSVG, e.clientX, e.clientY);
      if (dragging === 'A') setTriangle(triState.Cx, p.y, triState.Bx, triState.By);
      else if (dragging === 'B') setTriangle(triState.Ax, triState.Ay, p.x, triState.Cy);
    };
    const end = (e) => {
      if (activeHandle && e && e.pointerId !== undefined) {
        try { activeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      dragging = null;
      activeHandle = null;
    };

    triSVG.addEventListener('pointerdown', start);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    // 键盘可达性：聚焦手柄后用方向键微调
    $$('.vertex-handle', triSVG).forEach(h => {
      h.setAttribute('tabindex', '0');
      h.addEventListener('keydown', (e) => {
        const v = h.dataset.vertex;
        const step = 8;
        let handled = true;
        if (v === 'A') {
          if (e.key === 'ArrowUp') setTriangle(triState.Cx, triState.Ay - step, triState.Bx, triState.By);
          else if (e.key === 'ArrowDown') setTriangle(triState.Cx, triState.Ay + step, triState.Bx, triState.By);
          else handled = false;
        } else if (v === 'B') {
          if (e.key === 'ArrowLeft') setTriangle(triState.Ax, triState.Ay, triState.Bx - step, triState.Cy);
          else if (e.key === 'ArrowRight') setTriangle(triState.Ax, triState.Ay, triState.Bx + step, triState.Cy);
          else handled = false;
        }
        if (handled) e.preventDefault();
      });
    });

    setTriangle(80, 80, 320, 320);
  }

  /* ============================================================
     视图 2：单位圆
     ============================================================ */
  const circleSVG = $('#circle-svg');
  const circleState = { angle: 0 }; // 数学角度（弧度）
  const CIRCLE = { cx: 190, cy: 190, r: 140 };

  function initCircleTicks() {
    const g = $('#circle-ticks');
    let html = '';
    for (let i = -1; i <= 1; i++) {
      if (i === 0) continue;
      html += `<line x1="${CIRCLE.cx + i * CIRCLE.r}" y1="${CIRCLE.cy - 5}" x2="${CIRCLE.cx + i * CIRCLE.r}" y2="${CIRCLE.cy + 5}" />`;
      html += `<line x1="${CIRCLE.cx - 5}" y1="${CIRCLE.cy + i * CIRCLE.r}" x2="${CIRCLE.cx + 5}" y2="${CIRCLE.cy + i * CIRCLE.r}" />`;
    }
    g.innerHTML = html;
  }

  function setCircleAngle(deg) {
    circleState.angle = deg * Math.PI / 180;
    updateCircle();
  }

  function updateCircle() {
    const { cx, cy, r } = CIRCLE;
    const θ = circleState.angle;
    const px = cx + r * Math.cos(θ);
    const py = cy - r * Math.sin(θ); // SVG y 向下

    $('#circle-point').setAttribute('cx', px);
    $('#circle-point').setAttribute('cy', py);
    $('#radius-line').setAttribute('x2', px);
    $('#radius-line').setAttribute('y2', py);

    // sin 线（垂直：从 x 轴到点）
    $('#sin-line').setAttribute('x1', px);
    $('#sin-line').setAttribute('y1', cy);
    $('#sin-line').setAttribute('x2', px);
    $('#sin-line').setAttribute('y2', py);
    // cos 线（水平：从原点到点的 x 投影）
    $('#cos-line').setAttribute('x2', px);
    $('#cos-line').setAttribute('y2', cy);

    // tan 切线：在点所在半平面的切线（x = cx + sign*r）上，从 (cx+sign*r, cy) 到半径延长线交点
    const cosθ = Math.cos(θ);
    const sinθ = Math.sin(θ);
    const tanθ = Math.tan(θ);
    const tanLine = $('#tan-line');
    if (Math.abs(cosθ) < 1e-3) {
      tanLine.style.display = 'none';
    } else {
      tanLine.style.display = '';
      const sign = cosθ > 0 ? 1 : -1;
      const tx = cx + sign * r;
      const ty = cy - sign * r * tanθ;
      tanLine.setAttribute('x1', tx);
      tanLine.setAttribute('y1', cy);
      tanLine.setAttribute('x2', tx);
      tanLine.setAttribute('y2', ty);
    }

    // 角度扇形弧
    const arcR = 30;
    const startArcX = cx + arcR;
    const startArcY = cy;
    const endArcX = cx + arcR * Math.cos(θ);
    const endArcY = cy - arcR * Math.sin(θ);
    let θn = θ % TAU;
    if (θn < 0) θn += TAU;
    const largeArc = θn > Math.PI ? 1 : 0;
    const sweep = 0; // SVG y 向下，逆时针在屏幕上 = sweep 0
    $('#angle-arc').setAttribute('d', `M ${cx} ${cy} L ${startArcX} ${startArcY} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${endArcX} ${endArcY} Z`);

    // 数值显示
    const deg = ((θ * 180 / Math.PI) % 360 + 360) % 360;
    $('#c-angle').textContent = fmt(deg, 1) + '°';
    $('#c-cos').textContent = fmt(cosθ);
    $('#c-sin').textContent = fmt(sinθ);
    $('#c-tan').textContent = Math.abs(cosθ) < 1e-6 ? '∞' : fmt(tanθ);
  }

  function initCircleDrag() {
    initCircleTicks();
    let dragging = false;

    const pointToAngle = (clientX, clientY) => {
      const p = getSvgPoint(circleSVG, clientX, clientY);
      const dx = p.x - CIRCLE.cx;
      const dy = CIRCLE.cy - p.y; // 数学 y 向上
      let θ = Math.atan2(dy, dx);
      circleState.angle = θ;
      updateCircle();
    };

    circleSVG.addEventListener('pointerdown', (e) => {
      dragging = true;
      if (circleSVG.setPointerCapture) {
        try { circleSVG.setPointerCapture(e.pointerId); } catch (_) {}
      }
      pointToAngle(e.clientX, e.clientY);
      e.preventDefault();
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      pointToAngle(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointercancel', () => { dragging = false; });

    $$('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => setCircleAngle(parseFloat(btn.dataset.angle)));
    });

    setCircleAngle(0);
  }

  /* ============================================================
     视图 3：函数曲线
     ============================================================ */
  const curvesSVG = $('#curves-svg');
  const curvesState = { sin: true, cos: true, tan: false };
  const CURVES = { w: 720, h: 360, ox: 360, oy: 180, xSpan: 2 * Math.PI, ySpan: 1.5 };

  function xToPx(x) { return CURVES.ox + x * (320 / Math.PI); } // x ∈ [-2π, 2π] → [40, 680]
  function yToPx(y) { return CURVES.oy - y * (280 / 3); }       // y ∈ [-1.5, 1.5] → [320, 40]
  function pxToX(px) { return (px - CURVES.ox) * Math.PI / 320; }

  function drawCurves() {
    const grid = $('#curves-grid');
    const axes = $('#curves-axes');
    const paths = $('#curves-paths');
    let gridHtml = '';
    let axesHtml = '';

    // 网格：x 轴 π/2 刻度
    const xMarks = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2].map(k => k * Math.PI);
    xMarks.forEach(x => {
      const px = xToPx(x);
      gridHtml += `<line x1="${px}" y1="20" x2="${px}" y2="340" stroke="var(--tri-border)" stroke-width="1" opacity="0.5"/>`;
      const label = x === 0 ? '0' : (Math.abs(x - Math.PI) < 1e-6 ? 'π' : (x === -Math.PI ? '−π' : (x / Math.PI).toFixed(1).replace('.0','') + 'π'));
      axesHtml += `<text x="${px}" y="350" text-anchor="middle" class="formula" font-size="10" fill="var(--tri-muted-foreground)">${label}</text>`;
    });
    // y 网格
    [-1, -0.5, 0.5, 1].forEach(y => {
      const py = yToPx(y);
      gridHtml += `<line x1="40" y1="${py}" x2="680" y2="${py}" stroke="var(--tri-border)" stroke-width="1" opacity="0.5"/>`;
      axesHtml += `<text x="34" y="${py + 3}" text-anchor="end" class="formula" font-size="10" fill="var(--tri-muted-foreground)">${y}</text>`;
    });

    // 坐标轴
    axesHtml += `<line x1="40" y1="${CURVES.oy}" x2="680" y2="${CURVES.oy}" stroke="var(--tri-neutral-400)" stroke-width="1.5"/>`;
    axesHtml += `<line x1="${CURVES.ox}" y1="20" x2="${CURVES.ox}" y2="340" stroke="var(--tri-neutral-400)" stroke-width="1.5"/>`;
    axesHtml += `<text x="675" y="${CURVES.oy - 6}" text-anchor="end" class="formula" font-size="11" fill="var(--tri-muted-foreground)">x</text>`;
    axesHtml += `<text x="${CURVES.ox + 6}" y="26" class="formula" font-size="11" fill="var(--tri-muted-foreground)">y</text>`;

    grid.innerHTML = gridHtml;
    axes.innerHTML = axesHtml;

    // 曲线
    let pathsHtml = '';
    const step = 0.02;
    const drawFn = (fn, color, key) => {
      let d = '';
      let prevValid = false;
      for (let x = -CURVES.xSpan; x <= CURVES.xSpan + 1e-9; x += step) {
        let y;
        try { y = fn(x); } catch (_) { y = NaN; }
        if (!isFinite(y) || Math.abs(y) > 50) { prevValid = false; continue; }
        const py = yToPx(y);
        // 限制在画布内
        const cpy = clamp(py, 20, 340);
        d += (prevValid ? 'L' : 'M') + xToPx(x).toFixed(2) + ' ' + cpy.toFixed(2) + ' ';
        prevValid = true;
      }
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" opacity="0.9" data-key="${key}"/>`;
    };
    if (curvesState.sin) pathsHtml += drawFn(Math.sin, 'var(--tri-primary)', 'sin');
    if (curvesState.cos) pathsHtml += drawFn(Math.cos, 'var(--tri-state-success)', 'cos');
    if (curvesState.tan) pathsHtml += drawFn(Math.tan, 'var(--tri-state-warning)', 'tan');
    paths.innerHTML = pathsHtml;
  }

  function initCurves() {
    $$('.legend-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.fn;
        curvesState[key] = !curvesState[key];
        chip.classList.toggle('active', curvesState[key]);
        drawCurves();
      });
    });

    const cursorLine = $('#cursor-line');
    const cursorSin = $('#cursor-sin');
    const cursorCos = $('#cursor-cos');
    const cursorTan = $('#cursor-tan');

    const onMove = (clientX) => {
      const p = getSvgPoint(curvesSVG, clientX, 0);
      const x = clamp(pxToX(p.x), -CURVES.xSpan, CURVES.xSpan);
      const px = xToPx(x);
      cursorLine.setAttribute('x1', px);
      cursorLine.setAttribute('x2', px);
      cursorLine.style.display = '';

      const sv = Math.sin(x), cv = Math.cos(x), tv = Math.tan(x);
      if (curvesState.sin) {
        cursorSin.style.display = '';
        cursorSin.setAttribute('cx', px);
        cursorSin.setAttribute('cy', clamp(yToPx(sv), 20, 340));
      } else cursorSin.style.display = 'none';
      if (curvesState.cos) {
        cursorCos.style.display = '';
        cursorCos.setAttribute('cx', px);
        cursorCos.setAttribute('cy', clamp(yToPx(cv), 20, 340));
      } else cursorCos.style.display = 'none';
      if (curvesState.tan && Math.abs(cv) > 1e-3) {
        cursorTan.style.display = '';
        cursorTan.setAttribute('cx', px);
        cursorTan.setAttribute('cy', clamp(yToPx(tv), 20, 340));
      } else cursorTan.style.display = 'none';

      $('#cv-x').textContent = fmt(x, 2);
      $('#cv-sin').textContent = fmt(sv);
      $('#cv-cos').textContent = fmt(cv);
      $('#cv-tan').textContent = Math.abs(cv) < 1e-3 ? '∞' : fmt(tv);
    };

    curvesSVG.addEventListener('pointermove', (e) => onMove(e.clientX));
    curvesSVG.addEventListener('pointerleave', () => {
      cursorLine.style.display = 'none';
      cursorSin.style.display = 'none';
      cursorCos.style.display = 'none';
      cursorTan.style.display = 'none';
    });
  }

  /* ============================================================
     视图 4：三角形求解器
     ============================================================ */
  function clearSolver() {
    ['in-a','in-b','in-c','in-A'].forEach(id => $('#' + id).value = '');
    ['out-a','out-b','out-c','out-A','out-B','out-area','out-perim'].forEach(id => $('#' + id).textContent = '—');
    $('#solver-msg').textContent = '';
    drawSolverPreview(null);
  }

  function solveTriangle() {
    const a = parseFloat($('#in-a').value);
    const b = parseFloat($('#in-b').value);
    const c = parseFloat($('#in-c').value);
    const A = parseFloat($('#in-A').value);
    const msg = $('#solver-msg');
    msg.style.color = 'var(--tri-state-error)';

    const has = v => !isNaN(v) && v > 0;
    const known = [has(a), has(b), has(c), has(A)].filter(Boolean).length;

    if (known < 2) {
      msg.textContent = '请至少输入两个已知量。';
      return;
    }

    let ra, rb, rc, rA;
    try {
      if (has(a) && has(b)) {
        ra = a; rb = b;
        rc = Math.sqrt(a*a + b*b);
        rA = Math.atan2(a, b) * 180 / Math.PI;
      } else if (has(a) && has(c)) {
        if (a >= c) throw new Error('对边 a 必须小于斜边 c。');
        ra = a; rc = c;
        rb = Math.sqrt(c*c - a*a);
        rA = Math.asin(a / c) * 180 / Math.PI;
      } else if (has(b) && has(c)) {
        if (b >= c) throw new Error('邻边 b 必须小于斜边 c。');
        rb = b; rc = c;
        ra = Math.sqrt(c*c - b*b);
        rA = Math.acos(b / c) * 180 / Math.PI;
      } else if (has(a) && has(A)) {
        if (A <= 0 || A >= 90) throw new Error('∠A 必须为锐角（0°–90°）。');
        ra = a; rA = A;
        rc = a / Math.sin(A * Math.PI / 180);
        rb = a / Math.tan(A * Math.PI / 180);
      } else if (has(b) && has(A)) {
        if (A <= 0 || A >= 90) throw new Error('∠A 必须为锐角（0°–90°）。');
        rb = b; rA = A;
        rc = b / Math.cos(A * Math.PI / 180);
        ra = b * Math.tan(A * Math.PI / 180);
      } else if (has(c) && has(A)) {
        if (A <= 0 || A >= 90) throw new Error('∠A 必须为锐角（0°–90°）。');
        rc = c; rA = A;
        ra = c * Math.sin(A * Math.PI / 180);
        rb = c * Math.cos(A * Math.PI / 180);
      } else {
        msg.textContent = '请至少输入两个已知量（边或一边+一锐角）。';
        return;
      }
    } catch (err) {
      msg.textContent = err.message;
      return;
    }

    const rB = 90 - rA;
    const area = ra * rb / 2;
    const perim = ra + rb + rc;

    $('#out-a').textContent = fmt(ra);
    $('#out-b').textContent = fmt(rb);
    $('#out-c').textContent = fmt(rc);
    $('#out-A').textContent = fmt(rA, 2) + '°';
    $('#out-B').textContent = fmt(rB, 2) + '°';
    $('#out-area').textContent = fmt(area, 2);
    $('#out-perim').textContent = fmt(perim, 2);
    msg.style.color = 'var(--tri-state-success)';
    msg.textContent = '求解成功。';

    drawSolverPreview({ a: ra, b: rb, c: rc, A: rA });
  }

  function drawSolverPreview(t) {
    const svg = $('#solver-preview');
    if (!t) { svg.innerHTML = ''; return; }
    const pad = 30;
    const W = 240, H = 200;
    const maxLeg = Math.max(t.a, t.b);
    const scale = (Math.min(W, H) - pad * 2) / maxLeg;
    // C 在左下，A 在左上，B 在右下
    const Cx = pad, Cy = H - pad;
    const Ax = pad, Ay = H - pad - t.b * scale;
    const Bx = pad + t.a * scale, By = H - pad;
    svg.innerHTML = `
      <polygon points="${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}" fill="var(--tri-primary-50)" stroke="var(--tri-primary)" stroke-width="2" stroke-linejoin="round"/>
      <polyline points="${pad+15},${Cy} ${pad+15},${Cy-15} ${pad},${Cy-15}" fill="none" stroke="var(--tri-primary-700)" stroke-width="1.5"/>
      <text x="${Ax-12}" y="${Ay+4}" text-anchor="end" class="formula" font-size="12" font-weight="700" fill="var(--tri-foreground)">A</text>
      <text x="${Bx+8}" y="${By+4}" class="formula" font-size="12" font-weight="700" fill="var(--tri-foreground)">B</text>
      <text x="${Cx-12}" y="${Cy+4}" text-anchor="end" class="formula" font-size="12" font-weight="700" fill="var(--tri-foreground)">C</text>
      <text x="${Ax-12}" y="${(Ay+Cy)/2}" text-anchor="end" class="formula" font-size="11" fill="var(--tri-primary-800)">b=${fmt(t.b,2)}</text>
      <text x="${(Bx+Cx)/2}" y="${By+16}" text-anchor="middle" class="formula" font-size="11" fill="var(--tri-primary-800)">a=${fmt(t.a,2)}</text>
      <text x="${(Ax+Bx)/2 + 8}" y="${(Ay+By)/2 - 4}" class="formula" font-size="11" fill="var(--tri-primary-800)">c=${fmt(t.c,2)}</text>
    `;
  }

  function initSolver() {
    $('#solve-btn').addEventListener('click', solveTriangle);
    $('#solver-clear').addEventListener('click', clearSolver);
    $$('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.preset;
        const set = (a, b, c, A) => {
          $('#in-a').value = a ?? '';
          $('#in-b').value = b ?? '';
          $('#in-c').value = c ?? '';
          $('#in-A').value = A ?? '';
        };
        if (p === '3-4-5') set(3, 4, '', '');
        else if (p === '30-60-90') set(1, '', 2, 30);
        else if (p === '45-45-90') set(1, 1, '', '');
        solveTriangle();
      });
    });
    // 回车求解
    ['in-a','in-b','in-c','in-A'].forEach(id => {
      $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') solveTriangle(); });
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    initTheme();
    initTabs();
    initReset();
    initTriangleDrag();
    initCircleDrag();
    initCurves();
    initSolver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
