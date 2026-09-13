/* Canvas2D fallback renderer — used only when WebGL2 is unavailable.
   Mirrors the humanoid cross-section model from engine.js. */
'use strict'

;(function (global) {
  function create (canvas) {
    var ctx = canvas.getContext('2d')
    if (!ctx) return null

    var E = global.AstaEngine || {}
    var TOP_Y = E.TOP_Y == null ? 6.0 : E.TOP_Y
    var BOTTOM_Y = E.BOTTOM_Y == null ? 0.85 : E.BOTTOM_Y
    var ORB_Y = E.ORB_Y == null ? -0.85 : E.ORB_Y
    var FACE_Y = E.FACE_Y == null ? 4.58 : E.FACE_Y
    var sectionAt = E.sectionAt || function () { return { rx: 0, rz: 0 } }

    /* shoulder girdle + hanging upper arm, mirrored left/right */
    var LIMBS2D = [
      [[0.30, 3.30], [0.70, 3.24], [1.15, 3.10], [1.55, 2.88], [1.85, 2.60], [2.00, 2.30], [2.10, 2.05]],
      [[2.04, 1.92], [2.07, 1.45], [2.06, 1.00], [2.01, 0.55]]
    ]

    var NEURAL = [
      [[0, ORB_Y], [0, 1.30], [0, 2.10], [0, 2.70], [0, 3.56]],
      [[0, 2.55], [-0.28, 2.20], [-0.55, 1.70], [-0.72, 1.15], [-0.80, 0.55]],
      [[0, 2.55], [0.28, 2.20], [0.55, 1.70], [0.72, 1.15], [0.80, 0.55]],
      [[0, 2.36], [-0.26, 1.25], [-0.30, 0.65]],
      [[0, 2.36], [0.26, 1.25], [0.30, 0.65]]
    ]

    var dpr = 1, W = 1, H = 1

    function resize () {
      dpr = Math.min(global.devicePixelRatio || 1, 2)
      W = Math.max(1, canvas.clientWidth)
      H = Math.max(1, canvas.clientHeight)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    function render (s) {
      resize()
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)

      var aspect = W / H
      var halfH = Math.max(2.95, 3.10 / aspect)
      if (halfH > 4.2) halfH = 4.2
      var scale = H / (2 * halfH)
      var cx = W / 2
      var toY = function (y) { return (6.45 - y) * scale }

      ctx.globalCompositeOperation = 'lighter'

      var rings = 62
      for (var j = 0; j < rings; j++) {
        var ty = TOP_Y - (TOP_Y - BOTTOM_Y) * ((j + 0.5) / rings)
        var sec = sectionAt(ty)
        if (sec.rx < 0.05) continue
        var appear = 1 - (ty - BOTTOM_Y) / (TOP_Y - BOTTOM_Y)
        var local = Math.max(0, Math.min(1, (s.progress - appear * 0.55) / 0.35))
        if (local <= 0) continue
        var face = ty > 4.05 && ty < 5.3

        ctx.beginPath()
        var segs = 72
        for (var k = 0; k <= segs; k++) {
          var a = (k / segs) * Math.PI * 2
          var cosA = Math.cos(a), sinA = Math.sin(a)
          var wob = 1 + 0.028 * Math.sin(a * 3 + j * 0.7 + s.time * 0.9 * (0.4 + s.amp))
          var px = cx + cosA * sec.rx * wob * scale
          var py = toY(ty) - sinA * sec.rz * wob * scale * 0.18
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = face
          ? 'rgba(255,170,70,' + (0.34 * local) + ')'
          : 'rgba(30,190,255,' + (0.32 * local) + ')'
        ctx.lineWidth = 1.1
        ctx.shadowBlur = 12
        ctx.shadowColor = face ? 'rgba(255,145,0,0.75)' : 'rgba(0,229,255,0.65)'
        ctx.stroke()
      }

      /* shoulder girdle + upper arms */
      ctx.lineWidth = 1.1
      ctx.shadowBlur = 14
      ctx.shadowColor = 'rgba(0,229,255,0.7)'
      ctx.strokeStyle = 'rgba(45,200,255,' + (0.42 * s.progress) + ')'
      for (var side = -1; side <= 1; side += 2) {
        for (var L = 0; L < LIMBS2D.length; L++) {
          var lp = LIMBS2D[L]
          for (var w = -1; w <= 1; w++) {
            ctx.beginPath()
            for (var q = 0; q < lp.length; q++) {
              var lx = cx + side * (lp[q][0] + w * 0.33) * scale
              var ly = toY(lp[q][1]) + w * 0.05 * scale
              if (q === 0) ctx.moveTo(lx, ly)
              else ctx.lineTo(lx, ly)
            }
            ctx.stroke()
          }
        }
      }

      /* face core glow */
      var fy = toY(FACE_Y)
      var fr = 0.8 * scale * (0.6 + 0.4 * s.progress)
      var g1 = ctx.createRadialGradient(cx, fy, 0, cx, fy, fr)
      g1.addColorStop(0, 'rgba(255,200,120,' + (0.55 * s.progress) + ')')
      g1.addColorStop(0.45, 'rgba(255,145,0,' + (0.24 * s.progress) + ')')
      g1.addColorStop(1, 'rgba(255,145,0,0)')
      ctx.fillStyle = g1
      ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2); ctx.fill()

      /* neural filaments */
      ctx.lineWidth = 2
      ctx.shadowBlur = 18
      ctx.shadowColor = 'rgba(255,145,0,0.85)'
      ctx.strokeStyle = 'rgba(255,165,55,' + (0.6 * s.progress) + ')'
      for (var n = 0; n < NEURAL.length; n++) {
        var path = NEURAL[n]
        ctx.beginPath()
        for (var p = 0; p < path.length; p++) {
          var sx = cx + path[p][0] * scale
          var sy = toY(path[p][1])
          if (p === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
      }

      /* source orb below the figure */
      var oy = toY(ORB_Y)
      var orbR = (14 + 7 * s.amp) * 5
      var g2 = ctx.createRadialGradient(cx, oy, 0, cx, oy, orbR)
      g2.addColorStop(0, 'rgba(235,250,255,0.95)')
      g2.addColorStop(0.18, 'rgba(0,229,255,0.5)')
      g2.addColorStop(1, 'rgba(0,229,255,0)')
      ctx.fillStyle = g2
      ctx.beginPath(); ctx.arc(cx, oy, orbR, 0, Math.PI * 2); ctx.fill()

      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    return { ok: true, count: 0, resize: resize, render: render }
  }

  global.AstaFallback2D = { create: create }
})(window)
