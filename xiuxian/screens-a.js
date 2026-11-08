(function() {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }

    .screen {
      position: absolute; inset: 0;
      display: none; flex-direction: column;
      overflow: hidden;
    }
    .screen.active { display: flex; }

    /* === TITLE === */
    #scr-title {
      background: linear-gradient(180deg, rgba(5,15,30,.15) 0%, rgba(5,15,20,.05) 45%, rgba(5,20,15,.55) 100%);
      align-items: center; justify-content: center;
    }
    .ti-clouds { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .ti-cloud {
      position: absolute; background: rgba(255,255,255,0.06);
      border-radius: 50%; filter: blur(18px);
    }
    .ti-cloud-0 { width:260px;height:80px;top:8%;left:-10%;animation:cloudDrift 18s linear infinite; }
    .ti-cloud-1 { width:200px;height:60px;top:18%;right:-5%;animation:cloudDrift 24s linear infinite reverse; }
    .ti-cloud-2 { width:300px;height:70px;top:35%;left:-15%;animation:cloudDrift 20s linear infinite 4s; }
    .ti-cloud-3 { width:180px;height:55px;top:50%;right:-10%;animation:cloudDrift 16s linear infinite 8s reverse; }
    @keyframes cloudDrift {
      0%   { transform: translateX(0); opacity: 0.4; }
      50%  { opacity: 0.7; }
      100% { transform: translateX(130vw); opacity: 0.4; }
    }
    .ti-content {
      position: relative; z-index: 10;
      display: flex; flex-direction: column; align-items: center;
      padding: 0 24px;
    }
    .ti-title {
      font-size: 52px; font-weight: 900; letter-spacing: 8px;
      background: linear-gradient(180deg, #fff8e1 0%, #FFD700 45%, #DAA520 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 18px rgba(255,215,0,0.7)) drop-shadow(0 0 40px rgba(255,215,0,0.3));
      animation: titleShimmer 3s ease-in-out infinite;
      margin-bottom: 12px;
    }
    @keyframes titleShimmer {
      0%,100% { filter: drop-shadow(0 0 18px rgba(255,215,0,0.7)) drop-shadow(0 0 40px rgba(255,215,0,0.3)); }
      50%      { filter: drop-shadow(0 0 28px rgba(255,215,0,1))   drop-shadow(0 0 60px rgba(255,215,0,0.5)); }
    }
    .ti-subtitle {
      font-size: 15px; color: rgba(255,235,150,0.75); letter-spacing: 4px;
      margin-bottom: 64px; text-shadow: 0 0 12px rgba(255,215,0,0.4);
    }
    .ti-start-btn {
      padding: 16px 52px; font-size: 20px; font-weight: 700; letter-spacing: 4px;
      border: 2px solid #FFD700; border-radius: 40px;
      background: linear-gradient(135deg, rgba(218,165,32,0.25), rgba(255,215,0,0.15));
      color: #FFD700; cursor: pointer;
      box-shadow: 0 0 24px rgba(255,215,0,0.4), inset 0 0 12px rgba(255,215,0,0.1);
      transition: all 0.3s;
    }
    .ti-start-btn:hover { background: linear-gradient(135deg,rgba(218,165,32,0.45),rgba(255,215,0,0.3)); box-shadow: 0 0 40px rgba(255,215,0,0.7); }
    @keyframes tiPulse {
      0%,100% { box-shadow: 0 0 24px rgba(255,215,0,0.4), inset 0 0 12px rgba(255,215,0,0.1); transform: scale(1); }
      50%      { box-shadow: 0 0 48px rgba(255,215,0,0.8), inset 0 0 20px rgba(255,215,0,0.2); transform: scale(1.03); }
    }

    /* === CREATE === */
    #scr-create {
      background: linear-gradient(180deg,rgba(10,22,40,.55) 0%,rgba(26,42,26,.75) 100%);
      align-items: center; justify-content: center;
    }
    .cr-content {
      position: relative; z-index: 10; width: 100%;
      display: flex; flex-direction: column; align-items: center; padding: 24px;
    }
    .cr-title {
      font-size: 28px; font-weight: 800; letter-spacing: 6px;
      background: linear-gradient(180deg,#fff8e1,#FFD700);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      margin-bottom: 32px;
    }
    .cr-label { font-size: 13px; color: rgba(255,235,150,0.7); margin-bottom: 8px; align-self: flex-start; margin-left: 8px; }
    .cr-input {
      width: 100%; max-width: 280px; padding: 12px 18px; font-size: 18px;
      background: rgba(255,255,255,0.08); border: 1.5px solid rgba(218,165,32,0.5);
      border-radius: 12px; color: #fff; text-align: center; outline: none; margin-bottom: 20px;
    }
    .cr-input:focus { border-color: #FFD700; box-shadow: 0 0 12px rgba(255,215,0,0.3); }
    .cr-test-btn {
      padding: 14px 44px; font-size: 18px; font-weight: 700; letter-spacing: 3px;
      border: 2px solid #FFD700; border-radius: 30px;
      background: linear-gradient(135deg,rgba(218,165,32,0.3),rgba(255,215,0,0.15));
      color: #FFD700; cursor: pointer;
      box-shadow: 0 0 20px rgba(255,215,0,0.3);
      transition: all 0.2s; margin-bottom: 32px;
    }
    .cr-result { display: none; flex-direction: column; align-items: center; gap: 16px; width: 100%; }
    .cr-orb {
      width: 100px; height: 100px; border-radius: 50%;
      background: radial-gradient(circle at 40% 35%, rgba(255,255,255,0.35), rgba(100,200,255,0.15));
      border: 2px solid rgba(255,215,0,0.5);
      box-shadow: 0 0 30px rgba(100,200,255,0.4);
      position: relative; overflow: hidden;
    }
    @keyframes orbPulse {
      0%,100% { box-shadow: 0 0 30px rgba(100,200,255,0.4); transform: scale(1); }
      50%      { box-shadow: 0 0 60px rgba(100,200,255,0.8); transform: scale(1.08); }
    }
    .cr-pillar {
      width: 4px; height: 120px; border-radius: 2px;
      background: linear-gradient(to top, transparent, #FFD700);
      opacity: 0;
    }
    @keyframes pillarRise { 0%{opacity:0;transform:scaleY(0);transform-origin:bottom} 100%{opacity:1;transform:scaleY(1);transform-origin:bottom} }
    .cr-root-name {
      font-size: 22px; font-weight: 800; letter-spacing: 3px;
      opacity: 0; text-shadow: 0 0 20px currentColor;
    }
    @keyframes fadeInUp { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
    .cr-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
    .cr-reroll-btn {
      padding: 10px 22px; font-size: 14px; border: 1.5px solid #64C8FF; border-radius: 24px;
      background: rgba(100,200,255,0.1); color: #64C8FF; cursor: pointer;
    }
    .cr-confirm-btn {
      padding: 12px 36px; font-size: 17px; font-weight: 700; letter-spacing: 2px;
      border: 2px solid #FFD700; border-radius: 28px;
      background: linear-gradient(135deg,rgba(218,165,32,0.3),rgba(255,215,0,0.15));
      color: #FFD700; cursor: pointer;
    }

    /* === LOBBY === */
    #scr-lobby { position: absolute; inset: 0; }
    .lb-hud {
      position: absolute; top: 0; left: 0; right: 0; z-index: 30;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px;
      background: linear-gradient(180deg,rgba(0,0,0,0.65) 0%,transparent 100%);
    }
    .lb-hud-left { display: flex; align-items: center; gap: 10px; }
    .lb-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      border: 2px solid #DAA520;
      background: linear-gradient(135deg,rgba(218,165,32,0.3),rgba(100,200,255,0.15));
      display: flex; align-items: center; justify-content: center; font-size: 22px;
    }
    .lb-name { font-size: 15px; font-weight: 700; color: #fff; text-shadow: 0 0 8px rgba(0,0,0,0.8); }
    .lb-realm { font-size: 12px; color: rgba(255,235,150,0.8); margin-top: 2px; }
    .lb-hud-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .lb-power { font-size: 13px; color: #FFD700; font-weight: 700; }
    .lb-currencies { display: flex; gap: 8px; }
    .lb-currencies .bal-lingshi,
    .lb-currencies .bal-gem { font-size: 12px; color: rgba(255,255,255,0.9); }

    .lb-qi-bar {
      position: absolute; top: 70px; left: 14px; right: 14px; z-index: 30;
      height: 16px; border-radius: 8px;
      background: rgba(0,0,0,0.4); border: 1px solid rgba(218,165,32,0.4);
      overflow: hidden;
    }
    .lb-qi-fill {
      height: 100%;
      background: linear-gradient(90deg,#1e90ff,#00cfff,#7fff00);
      border-radius: 8px; transition: width 0.4s ease;
    }
    .lb-qi-text {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: rgba(255,255,255,0.9); font-weight: 600;
    }

    .lb-doll-wrap {
      position: absolute; left: 0; right: 0; margin: 0 auto; top: 90px;
      width: min(58vw, 280px); z-index: 20;
    }
    .lb-doll-wrap .doll { width: 100%; }
    .lb-aura {
      position: absolute; left: 50%; top: 75%;
      transform: translate(-50%,-50%);
      width: 160px; height: 48px; border-radius: 50%;
      background: radial-gradient(ellipse at center,rgba(100,200,255,0.3),transparent 70%);
      animation: auraBreath 2.5s ease-in-out infinite; z-index: 15;
    }
    @keyframes auraBreath {
      0%,100%{opacity:0.5;transform:translate(-50%,-50%) scaleX(1)}
      50%{opacity:1;transform:translate(-50%,-50%) scaleX(1.15)}
    }
    .lb-petals { position: absolute; inset: 0; pointer-events: none; z-index: 18; }

    .lb-icons-right {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; gap: 8px; z-index: 30;
    }
    .lb-icon-btn {
      width: 48px; height: 48px; border-radius: 12px;
      background: rgba(0,0,0,0.45); border: 1px solid rgba(218,165,32,0.5);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; cursor: pointer; gap: 2px;
      backdrop-filter: blur(6px);
    }
    .lb-icon-btn span.lb-icon-lbl { font-size: 10px; color: rgba(255,235,150,0.9); }
    .lb-icon-btn .lb-icon-em { font-size: 18px; line-height: 1; }

    .lb-banner {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      width: 100px; z-index: 30; cursor: pointer;
      background: linear-gradient(135deg,rgba(20,10,40,0.8),rgba(100,50,150,0.6));
      border: 1.5px solid rgba(218,165,32,0.6); border-radius: 14px;
      padding: 10px 6px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      box-shadow: 0 0 16px rgba(218,165,32,0.25);
      animation: bannerGlow 3s ease-in-out infinite;
    }
    @keyframes bannerGlow {
      0%,100%{box-shadow:0 0 16px rgba(218,165,32,0.25)}
      50%{box-shadow:0 0 28px rgba(218,165,32,0.55)}
    }
    .lb-banner-icon { font-size: 26px; }
    .lb-banner-title { font-size: 11px; font-weight: 700; color: #FFD700; letter-spacing: 1px; }
    .lb-banner-sub { font-size: 9px; color: rgba(255,235,150,0.7); text-align: center; }

    .lb-nav {
      position: absolute; bottom: 0; left: 0; right: 0; z-index: 30;
      display: flex; align-items: stretch;
      background: linear-gradient(0deg,rgba(0,0,0,0.8),rgba(0,0,0,0.5));
      border-top: 1px solid rgba(218,165,32,0.35);
      backdrop-filter: blur(10px);
      height: 56px;
      padding-right: 150px;
    }
    .lb-nav-btn {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; background: none; border: none; cursor: pointer; padding: 0;
    }
    .lb-nav-btn .lb-nav-icon { font-size: 20px; line-height: 1; }
    .lb-nav-btn .lb-nav-lbl { font-size: 12px; color: rgba(255,235,150,0.9); }
    .lb-nav-btn:active { background: rgba(255,215,0,0.1); }

    /* === HALL === */
    #scr-hall {
      background: linear-gradient(180deg,#0d1a12 0%,#091510 100%);
      flex-direction: column; overflow: hidden;
    }
    .hl-topbar {
      display: flex; align-items: center; padding: 10px 14px;
      background: linear-gradient(90deg,rgba(218,165,32,0.18),rgba(0,0,0,0.3));
      border-bottom: 1px solid rgba(218,165,32,0.35);
      flex-shrink: 0; z-index: 20;
    }
    .hl-back-btn {
      background: none; border: none; font-size: 22px; cursor: pointer;
      color: rgba(255,235,150,0.9); margin-right: 10px;
    }
    .hl-bar-title { flex: 1; font-size: 16px; font-weight: 700; color: rgba(255,235,150,0.95); }
    .hl-bar-bal { font-size: 12px; color: rgba(255,235,150,0.8); margin-left: 8px; }

    .hl-realm-card {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 16px; flex-shrink: 0;
      background: linear-gradient(90deg,rgba(218,165,32,0.08),transparent);
    }
    .hl-ring-wrap { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
    .hl-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
    .hl-ring-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 7; }
    .hl-ring-prog {
      fill: none;
      stroke: url(#ringGrad); stroke-width: 7;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }
    .hl-ring-label {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .hl-realm-name { font-size: 14px; font-weight: 800; color: #FFD700; }
    .hl-realm-stage { font-size: 11px; color: rgba(255,235,150,0.75); margin-top: 2px; }
    .hl-stats { display: flex; flex-direction: column; gap: 5px; flex: 1; }
    .hl-stat { font-size: 13px; color: rgba(255,255,255,0.85); }
    .hl-stat-val { color: #FFD700; font-weight: 700; }

    .hl-center {
      position: relative; flex: 1; min-height: 0;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .hl-vortex {
      position: absolute; inset: 0; pointer-events: none; z-index: 5;
    }
    .hl-doll-wrap {
      position: absolute; left: 0; right: 0; margin: 0 auto; bottom: 0;
      width: min(50vw, 220px); z-index: 10;
    }
    .hl-orb {
      position: absolute; left: 50%; bottom: 8%;
      transform: translateX(-50%);
      width: 80px; height: 80px; border-radius: 50%; cursor: pointer; z-index: 8;
      background: radial-gradient(circle at 40% 35%, rgba(180,240,255,0.5), rgba(50,150,255,0.15));
      border: 2px solid rgba(100,200,255,0.6);
      box-shadow: 0 0 24px rgba(100,200,255,0.5);
      animation: orbFloat 2.5s ease-in-out infinite;
    }
    @keyframes orbFloat {
      0%,100%{transform:translateX(-50%) translateY(0);box-shadow:0 0 24px rgba(100,200,255,0.5)}
      50%{transform:translateX(-50%) translateY(-8px);box-shadow:0 0 40px rgba(100,200,255,0.8)}
    }
    .hl-orb-inner {
      width: 50%; height: 50%; border-radius: 50%; margin: 25%;
      background: rgba(255,255,255,0.3);
    }

    .hl-bottom {
      flex-shrink: 0; overflow-y: auto;
      max-height: 220px;
      padding: 8px 14px 0;
      background: linear-gradient(0deg,rgba(0,0,0,0.7),rgba(0,0,0,0.3));
      border-top: 1px solid rgba(218,165,32,0.25);
    }
    .hl-tech-title { font-size: 14px; color: rgba(255,235,150,0.8); font-weight: 700; margin-bottom: 8px; }
    .hl-tech-list { display: flex; flex-direction: column; gap: 6px; }
    .hl-tech-card {
      display: flex; align-items: center; padding: 8px 10px; border-radius: 10px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(218,165,32,0.2);
      gap: 10px;
    }
    .hl-tech-info { flex: 1; }
    .hl-tech-name { font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 600; }
    .hl-tech-eff { font-size: 11px; color: rgba(100,200,255,0.8); margin-top: 2px; }
    .hl-tech-up {
      padding: 6px 12px; font-size: 12px; border-radius: 16px;
      border: 1px solid #64C8FF; background: rgba(100,200,255,0.1); color: #64C8FF; cursor: pointer;
    }
    .hl-tech-up:disabled { opacity: 0.4; cursor: default; }
    .hl-break-btn {
      position: fixed; bottom: 70px; left: 14px;
      width: calc(100% - 170px); max-width: 472px;
      padding: 14px; font-size: 18px; font-weight: 800; letter-spacing: 4px;
      border: 2px solid #FFD700; border-radius: 28px;
      background: linear-gradient(135deg,rgba(218,165,32,0.35),rgba(255,215,0,0.15));
      color: #FFD700; cursor: pointer;
      box-shadow: 0 0 20px rgba(255,215,0,0.3);
      animation: breakGlow 3s ease-in-out infinite;
      z-index: 25;
    }
    @keyframes breakGlow {
      0%,100%{box-shadow:0 0 20px rgba(255,215,0,0.3)}
      50%{box-shadow:0 0 36px rgba(255,215,0,0.6)}
    }

    /* === TRIBULATION === */
    #scr-tribulation {
      background: #080c14;
      flex-direction: column; position: relative; overflow: hidden;
    }
    .tb-hud {
      position: relative; z-index: 20; padding: 14px 18px 10px;
      background: linear-gradient(180deg,rgba(0,0,0,0.7),transparent);
    }
    .tb-title {
      font-size: 22px; font-weight: 900; letter-spacing: 5px; text-align: center;
      color: #64C8FF; text-shadow: 0 0 20px #64C8FF; margin-bottom: 10px;
    }
    .tb-hp-bar {
      height: 18px; background: rgba(0,0,0,0.5); border: 1px solid rgba(100,200,255,0.4);
      border-radius: 9px; overflow: hidden; position: relative; margin-bottom: 6px;
    }
    .tb-hp-fill {
      height: 100%; border-radius: 9px;
      background: linear-gradient(90deg,#00cfff,#1e90ff);
      transition: width 0.3s ease;
    }
    .tb-hp-text {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 600;
    }
    .tb-strike-count { font-size: 13px; color: rgba(255,235,150,0.8); text-align: center; }
    .tb-canvas {
      position: absolute; inset: 0; z-index: 10; pointer-events: none;
    }
    .tb-warn-circle {
      position: absolute; border-radius: 50%; z-index: 15; pointer-events: none;
      border: 3px solid #FF4444; box-shadow: 0 0 20px #FF4444;
      display: none; margin-left: -50px; margin-top: -50px;
      animation: warnShrink 2s linear forwards;
    }
    @keyframes warnShrink {
      0%  { transform: scale(1); opacity: 1; }
      80% { transform: scale(0.15); opacity: 1; }
      100%{ transform: scale(0); opacity: 0; }
    }
    .tb-shield-btn {
      position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
      z-index: 25; padding: 18px 56px; font-size: 20px; font-weight: 800; letter-spacing: 4px;
      border: 2px solid #64C8FF; border-radius: 36px;
      background: linear-gradient(135deg,rgba(100,200,255,0.25),rgba(30,144,255,0.15));
      color: #64C8FF; cursor: pointer;
      box-shadow: 0 0 24px rgba(100,200,255,0.4);
      animation: shieldPulse 1.5s ease-in-out infinite;
    }
    @keyframes shieldPulse {
      0%,100%{box-shadow:0 0 24px rgba(100,200,255,0.4)}
      50%{box-shadow:0 0 44px rgba(100,200,255,0.7)}
    }

    /* === MODALS / SHARED === */
    .sa-modal { padding: 4px; }
    .sa-modal h3 {
      font-size: 18px; font-weight: 800; text-align: center; margin-bottom: 14px;
      background: linear-gradient(90deg,#DAA520,#FFD700); -webkit-background-clip: text;
      -webkit-text-fill-color: transparent; background-clip: text;
    }
    .sa-btn {
      padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: 20px;
      cursor: pointer; border: none; transition: opacity 0.2s;
    }
    .sa-btn:active { opacity: 0.75; }
    .sa-btn-gold {
      background: linear-gradient(135deg,#DAA520,#FFD700);
      color: #1a0a00;
    }
    .sa-btn-blue {
      background: rgba(100,200,255,0.15); border: 1.5px solid #64C8FF; color: #64C8FF;
    }

    /* Signin */
    .sg-grid {
      display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; margin-bottom: 16px;
    }
    .sg-day {
      display: flex; flex-direction: column; align-items: center;
      padding: 6px 2px; border-radius: 8px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(218,165,32,0.2);
      position: relative;
    }
    .sg-day.sg-current { border-color: #FFD700; background: rgba(255,215,0,0.1); }
    .sg-day.sg-claimed { opacity: 0.5; }
    .sg-day-lbl { font-size: 9px; color: rgba(255,235,150,0.7); }
    .sg-day-r { font-size: 10px; color: #FFD700; }
    .sg-check { font-size: 14px; color: #64C8FF; }

    /* Missions */
    .ms-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
    .ms-card {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(218,165,32,0.2);
    }
    .ms-card.ms-claimed { opacity: 0.55; }
    .ms-info { flex: 1; }
    .ms-name { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.9); }
    .ms-prog { font-size: 11px; color: rgba(255,235,150,0.7); margin-top: 2px; }
    .ms-bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); margin-top: 4px; }
    .ms-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg,#1e90ff,#00cfff); }
    .ms-reward { font-size: 12px; color: #FFD700; white-space: nowrap; }
    .ms-claim { padding: 6px 12px; font-size: 12px; }

    /* Settings */
    .st-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.85); font-size: 15px;
    }
    .st-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }

    /* Offline popup */
    .of-modal { text-align: center; }
    .of-modal p { color: rgba(255,255,255,0.85); margin: 8px 0; font-size: 14px; }
    .of-hi { color: #FFD700; font-weight: 700; font-size: 18px; }

    @keyframes dollIn {
      from { opacity:0; transform:translateY(16px) scale(0.93); }
      to   { opacity:1; transform:none; }
    }
  `;
  document.head.appendChild(style);

  (function injectSvgDefs() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    svg.innerHTML = '<defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#DAA520"/><stop offset="100%" stop-color="#FFD700"/></linearGradient></defs>';
    document.body.appendChild(svg);
  })();

  const D = window.XianData;
  const E = window.XianEconomy;
  const X = window.X;

  (function buildTitle() {
    const el = document.createElement('section');
    el.className = 'screen'; el.id = 'scr-title';

    const cloudsDiv = document.createElement('div');
    cloudsDiv.className = 'ti-clouds';
    for (let i = 0; i < 4; i++) {
      const c = document.createElement('div');
      c.className = 'ti-cloud ti-cloud-' + i;
      cloudsDiv.appendChild(c);
    }

    const content = document.createElement('div');
    content.className = 'ti-content';

    const h1 = document.createElement('div');
    h1.className = 'ti-title'; h1.textContent = '云阙问仙';

    const sub = document.createElement('div');
    sub.className = 'ti-subtitle'; sub.textContent = '修仙 · 换装 · 问道长生';

    const btn = document.createElement('button');
    btn.className = 'ti-start-btn'; btn.textContent = '踏入仙途';
    btn.addEventListener('click', () => {
      X.sfx('chime');
      X.show(X.S.created ? 'lobby' : 'create');
    });

    content.appendChild(h1);
    content.appendChild(sub);
    content.appendChild(btn);
    el.appendChild(cloudsDiv);
    el.appendChild(content);
    document.getElementById('screens').appendChild(el);

    X.screens.title = {
      el,
      enter() {
        if (D && D.scenes && D.scenes.title) X.setBg(D.scenes.title, false);
        btn.style.animation = 'tiPulse 2s ease-in-out infinite';
      },
      leave() { btn.style.animation = ''; }
    };
  })();

  (function buildCreate() {
    const el = document.createElement('section');
    el.className = 'screen'; el.id = 'scr-create';

    const content = document.createElement('div');
    content.className = 'cr-content';

    const title = document.createElement('div');
    title.className = 'cr-title'; title.textContent = '踏入仙途';

    const label = document.createElement('div');
    label.className = 'cr-label'; label.textContent = '道号';

    const input = document.createElement('input');
    input.className = 'cr-input'; input.type = 'text';
    input.maxLength = 8; input.placeholder = '请输入道号';

    const testBtn = document.createElement('button');
    testBtn.className = 'cr-test-btn'; testBtn.textContent = '测灵根';

    const resultDiv = document.createElement('div');
    resultDiv.className = 'cr-result';

    const orb = document.createElement('div'); orb.className = 'cr-orb';
    const pillar = document.createElement('div'); pillar.className = 'cr-pillar';
    const rootNameEl = document.createElement('div'); rootNameEl.className = 'cr-root-name';

    const actions = document.createElement('div'); actions.className = 'cr-actions';
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'cr-reroll-btn'; rerollBtn.textContent = '💎20 重测';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'cr-confirm-btn'; confirmBtn.textContent = '开始修仙';
    actions.appendChild(rerollBtn); actions.appendChild(confirmBtn);

    resultDiv.appendChild(orb);
    resultDiv.appendChild(pillar);
    resultDiv.appendChild(rootNameEl);
    resultDiv.appendChild(actions);

    content.appendChild(title);
    content.appendChild(label);
    content.appendChild(input);
    content.appendChild(testBtn);
    content.appendChild(resultDiv);
    el.appendChild(content);
    document.getElementById('screens').appendChild(el);

    let selectedRoot = null;

    function rollRoot() {
      const roots = X.G.roots;
      const total = roots.reduce((s, r) => s + r.weight, 0);
      let rand = Math.random() * total;
      for (const r of roots) { rand -= r.weight; if (rand <= 0) return r; }
      return roots[roots.length - 1];
    }

    function revealRoot(root) {
      selectedRoot = root;
      X.sfx('chime');
      orb.style.animation = 'orbPulse 1.5s ease-in-out 2';
      pillar.style.cssText += 'background:linear-gradient(to top,transparent,' + root.color + ');animation:pillarRise 1.5s ease-out forwards';
      rootNameEl.textContent = '';
      setTimeout(() => {
        rootNameEl.textContent = root.name;
        rootNameEl.style.color = root.color;
        rootNameEl.style.animation = 'fadeInUp 0.8s ease-out forwards';
        rootNameEl.style.opacity = '0';
        X.fx.burst(
          el.offsetLeft + el.offsetWidth / 2,
          el.offsetTop + el.offsetHeight / 2,
          root.color, 25
        );
      }, 900);
    }

    testBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) { X.toast('请输入道号', 'error'); return; }
      X.sfx('click');
      testBtn.style.display = 'none';
      input.disabled = true;
      resultDiv.style.display = 'flex';
      setTimeout(() => revealRoot(rollRoot()), 200);
    });

    rerollBtn.addEventListener('click', () => {
      if (!E.spend('gem', 20, 'reroll_root')) { X.toast('仙玉不足', 'error'); return; }
      X.sfx('coin');
      rootNameEl.style.animation = '';
      rootNameEl.textContent = '';
      pillar.style.animation = '';
      setTimeout(() => revealRoot(rollRoot()), 100);
    });

    confirmBtn.addEventListener('click', () => {
      if (!selectedRoot) { X.toast('请先测灵根', 'error'); return; }
      const name = input.value.trim() || '云瑶';
      X.sfx('chime');
      X.newGame(name, selectedRoot.id);
      X.fx.flash('#FFD700');
      setTimeout(() => X.show('lobby'), 350);
    });

    X.screens.create = {
      el,
      enter() {
        if (D && D.scenes && D.scenes.title) X.setBg(D.scenes.title, false);
        input.value = '云瑶'; input.disabled = false;
        testBtn.style.display = '';
        resultDiv.style.display = 'none';
        rootNameEl.textContent = ''; rootNameEl.style.animation = '';
        pillar.style.animation = '';
        selectedRoot = null;
      },
      leave() {}
    };
  })();

  (function buildLobby() {
    const el = document.createElement('section');
    el.className = 'screen'; el.id = 'scr-lobby';

    const hud = document.createElement('div'); hud.className = 'lb-hud';
    const hudL = document.createElement('div'); hudL.className = 'lb-hud-left';
    const avatar = document.createElement('div'); avatar.className = 'lb-avatar'; avatar.textContent = '🧘';
    const info = document.createElement('div');
    const nameEl = document.createElement('div'); nameEl.className = 'lb-name';
    const realmEl = document.createElement('div'); realmEl.className = 'lb-realm';
    info.appendChild(nameEl); info.appendChild(realmEl);
    hudL.appendChild(avatar); hudL.appendChild(info);

    const hudR = document.createElement('div'); hudR.className = 'lb-hud-right';
    const powerEl = document.createElement('div'); powerEl.className = 'lb-power';
    const currs = document.createElement('div'); currs.className = 'lb-currencies';
    const lsEl = document.createElement('span'); lsEl.className = 'bal-lingshi';
    const gmEl = document.createElement('span'); gmEl.className = 'bal-gem';
    currs.appendChild(lsEl); currs.appendChild(gmEl);
    hudR.appendChild(powerEl); hudR.appendChild(currs);
    hud.appendChild(hudL); hud.appendChild(hudR);

    const qiBar = document.createElement('div'); qiBar.className = 'lb-qi-bar';
    const qiFill = document.createElement('div'); qiFill.className = 'lb-qi-fill';
    const qiText = document.createElement('div'); qiText.className = 'lb-qi-text';
    qiBar.appendChild(qiFill); qiBar.appendChild(qiText);

    const aura = document.createElement('div'); aura.className = 'lb-aura';
    const petalsCanvas = document.createElement('canvas'); petalsCanvas.className = 'lb-petals';
    const dollWrap = document.createElement('div'); dollWrap.className = 'lb-doll-wrap';

    const iconsRight = document.createElement('div'); iconsRight.className = 'lb-icons-right';
    const iconDefs = [
      { action: 'signin', icon: '🎁', label: '签到' },
      { action: 'missions', icon: '📜', label: '任务' },
      { action: 'settings', icon: '⚙️', label: '设置' }
    ];
    iconDefs.forEach(def => {
      const btn = document.createElement('button'); btn.className = 'lb-icon-btn';
      btn.dataset.action = def.action;
      const em = document.createElement('span'); em.className = 'lb-icon-em'; em.textContent = def.icon;
      const lb = document.createElement('span'); lb.className = 'lb-icon-lbl'; lb.textContent = def.label;
      btn.appendChild(em); btn.appendChild(lb);
      btn.addEventListener('click', () => {
        X.sfx('click');
        if (def.action === 'signin') showSignin();
        else if (def.action === 'missions') showMissions();
        else showSettings();
      });
      iconsRight.appendChild(btn);
    });

    const banner = document.createElement('div'); banner.className = 'lb-banner';
    banner.innerHTML = '<span class="lb-banner-icon">🌸</span><span class="lb-banner-title">仙缘祈愿</span><span class="lb-banner-sub">限时祈愿<br>仙衣降世</span>';
    banner.addEventListener('click', () => { X.sfx('click'); X.show('gacha'); });

    const nav = document.createElement('div'); nav.className = 'lb-nav';
    const navItems = [
      { screen: 'hall', icon: '🧘', label: '修炼' },
      { screen: 'wardrobe', icon: '👘', label: '衣橱' },
      { screen: 'bag', icon: '🎒', label: '背包' },
      { screen: 'map', icon: '🗺️', label: '秘境' },
      { screen: 'alchemy', icon: '⚗️', label: '炼丹' }
    ];
    navItems.forEach(ni => {
      const btn = document.createElement('button'); btn.className = 'lb-nav-btn';
      const iconEl = document.createElement('span'); iconEl.className = 'lb-nav-icon'; iconEl.textContent = ni.icon;
      const lblEl = document.createElement('span'); lblEl.className = 'lb-nav-lbl'; lblEl.textContent = ni.label;
      btn.appendChild(iconEl); btn.appendChild(lblEl);
      btn.addEventListener('click', () => { X.sfx('click'); X.show(ni.screen); });
      nav.appendChild(btn);
    });

    el.appendChild(hud);
    el.appendChild(qiBar);
    el.appendChild(aura);
    el.appendChild(petalsCanvas);
    el.appendChild(dollWrap);
    el.appendChild(iconsRight);
    el.appendChild(banner);
    el.appendChild(nav);
    document.getElementById('screens').appendChild(el);

    let petalsAnim = null;
    const petalData = [];

    function initPetals() {
      petalsCanvas.width = el.offsetWidth * (window.devicePixelRatio || 1);
      petalsCanvas.height = el.offsetHeight * (window.devicePixelRatio || 1);
      petalsCanvas.style.width = el.offsetWidth + 'px';
      petalsCanvas.style.height = el.offsetHeight + 'px';
      const ctx = petalsCanvas.getContext('2d');
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      const W = el.offsetWidth, H = el.offsetHeight;
      petalData.length = 0;
      for (let i = 0; i < 14; i++) {
        petalData.push({
          x: Math.random() * W, y: Math.random() * H,
          sz: 5 + Math.random() * 6, speed: 0.3 + Math.random() * 0.5,
          sw: Math.random() * Math.PI * 2, swS: 0.018 + Math.random() * 0.015,
          op: 0.25 + Math.random() * 0.35
        });
      }
      function draw() {
        ctx.clearRect(0, 0, W, H);
        petalData.forEach(p => {
          p.y += p.speed; p.x += Math.sin(p.sw) * 0.4; p.sw += p.swS;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
          ctx.fillStyle = 'rgba(255,182,193,' + p.op + ')';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.sz, p.sz * 0.6, p.sw, 0, Math.PI * 2);
          ctx.fill();
        });
        petalsAnim = requestAnimationFrame(draw);
      }
      if (petalsAnim) cancelAnimationFrame(petalsAnim);
      draw();
    }

    function updateUI() {
      const stats = X.stats();
      const need = X.qiNeed();
      const pct = Math.min(100, (X.S.qi / need) * 100);
      qiFill.style.width = pct + '%';
      qiText.textContent = '修为 ' + X.fmt(Math.floor(X.S.qi)) + ' / ' + X.fmt(need);
      nameEl.textContent = X.S.name;
      realmEl.textContent = X.realmLabel();
      powerEl.textContent = '⚔ ' + X.fmt(stats.power);
      X.refreshBalances();
    }

    let updateInterval = null;

    X.screens.lobby = {
      el,
      enter() {
        if (D && D.scenes && D.scenes.lobby) X.setBg(D.scenes.lobby, false);
        dollWrap.innerHTML = '';
        X.Doll.render(dollWrap, Object.assign({}, X.S.equipped), { animate: true });
        updateUI();
        initPetals();
        updateInterval = setInterval(updateUI, 2000);

        if (X.offlineGain && X.offlineGain > 60) {
          setTimeout(() => {
            const gain = X.offlineGain;
            const modal = X.modal('<div class="sa-modal of-modal"><h3>闭关归来</h3><p>离线修炼已自动积累灵气</p><p>获得修为 <span class="of-hi">+' + X.fmt(Math.floor(gain)) + '</span></p><button class="sa-btn sa-btn-gold" id="ofClose" style="margin-top:14px;display:block;width:100%">继续修炼</button></div>', {});
            const closeBtn = modal.el.querySelector('#ofClose');
            if (closeBtn) closeBtn.addEventListener('click', () => { X.sfx('click'); modal.close(); });
            X.offlineGain = null;
          }, 600);
        }
      },
      leave() {
        if (petalsAnim) { cancelAnimationFrame(petalsAnim); petalsAnim = null; }
        if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
      },
      refresh: updateUI
    };
  })();

  (function buildHall() {
    const el = document.createElement('section');
    el.className = 'screen'; el.id = 'scr-hall';

    const topBar = document.createElement('div'); topBar.className = 'hl-topbar';
    const backBtn = document.createElement('button'); backBtn.className = 'hl-back-btn'; backBtn.textContent = '←';
    backBtn.addEventListener('click', () => X.back());
    const barTitle = document.createElement('span'); barTitle.className = 'hl-bar-title'; barTitle.textContent = '修炼大殿';
    const balLS = document.createElement('span'); balLS.className = 'bal-lingshi hl-bar-bal';
    const balGM = document.createElement('span'); balGM.className = 'bal-gem hl-bar-bal';
    topBar.appendChild(backBtn); topBar.appendChild(barTitle);
    topBar.appendChild(balLS); topBar.appendChild(balGM);

    const realmCard = document.createElement('div'); realmCard.className = 'hl-realm-card';
    const ringWrap = document.createElement('div'); ringWrap.className = 'hl-ring-wrap';
    const ringNS = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(ringNS, 'svg');
    svgEl.setAttribute('viewBox', '0 0 120 120'); svgEl.classList.add('hl-ring');
    const ringBg = document.createElementNS(ringNS, 'circle');
    ringBg.setAttribute('cx','60'); ringBg.setAttribute('cy','60'); ringBg.setAttribute('r','54');
    ringBg.classList.add('hl-ring-bg');
    const ringProg = document.createElementNS(ringNS, 'circle');
    ringProg.setAttribute('cx','60'); ringProg.setAttribute('cy','60'); ringProg.setAttribute('r','54');
    ringProg.classList.add('hl-ring-prog');
    svgEl.appendChild(ringBg); svgEl.appendChild(ringProg);
    const ringLabel = document.createElement('div'); ringLabel.className = 'hl-ring-label';
    const realmNameEl = document.createElement('div'); realmNameEl.className = 'hl-realm-name';
    const realmStageEl = document.createElement('div'); realmStageEl.className = 'hl-realm-stage';
    ringLabel.appendChild(realmNameEl); ringLabel.appendChild(realmStageEl);
    ringWrap.appendChild(svgEl); ringWrap.appendChild(ringLabel);

    const statsDiv = document.createElement('div'); statsDiv.className = 'hl-stats';
    const atkEl = document.createElement('div'); atkEl.className = 'hl-stat';
    const defEl = document.createElement('div'); defEl.className = 'hl-stat';
    const hpEl = document.createElement('div'); hpEl.className = 'hl-stat';
    statsDiv.appendChild(atkEl); statsDiv.appendChild(defEl); statsDiv.appendChild(hpEl);
    realmCard.appendChild(ringWrap); realmCard.appendChild(statsDiv);

    const center = document.createElement('div'); center.className = 'hl-center';
    const vortexCanvas = document.createElement('canvas'); vortexCanvas.className = 'hl-vortex';
    const dollWrap = document.createElement('div'); dollWrap.className = 'hl-doll-wrap';
    const orb = document.createElement('div'); orb.className = 'hl-orb';
    const orbInner = document.createElement('div'); orbInner.className = 'hl-orb-inner';
    orb.appendChild(orbInner);
    center.appendChild(vortexCanvas); center.appendChild(dollWrap); center.appendChild(orb);

    const bottom = document.createElement('div'); bottom.className = 'hl-bottom hl-bottom';
    const techTitle = document.createElement('div'); techTitle.className = 'hl-tech-title'; techTitle.textContent = '功法';
    const techList = document.createElement('div'); techList.className = 'hl-tech-list';
    bottom.appendChild(techTitle); bottom.appendChild(techList);

    const breakBtn = document.createElement('button'); breakBtn.className = 'hl-break-btn'; breakBtn.textContent = '突破';
    breakBtn.addEventListener('click', () => { if (X.screens.hall && X.screens.hall.doBreak) X.screens.hall.doBreak(); });

    el.appendChild(topBar); el.appendChild(realmCard); el.appendChild(center);
    el.appendChild(breakBtn); el.appendChild(bottom);
    document.getElementById('screens').appendChild(el);

    let vortexAnim = null;
    let vAngle = 0;
    function startVortex() {
      const dpr = window.devicePixelRatio || 1;
      vortexCanvas.width = vortexCanvas.offsetWidth * dpr;
      vortexCanvas.height = vortexCanvas.offsetHeight * dpr;
      const ctx = vortexCanvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = vortexCanvas.offsetWidth, H = vortexCanvas.offsetHeight;
      const cx = W / 2, cy = H / 2;
      function draw() {
        ctx.clearRect(0, 0, W, H);
        vAngle += 0.018;
        for (let i = 0; i < 24; i++) {
          const a = vAngle + i * (Math.PI * 2 / 24);
          const r = 30 + i * 6;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          const alpha = Math.max(0, 0.35 - i * 0.012);
          ctx.fillStyle = 'rgba(100,200,255,' + alpha + ')';
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        vortexAnim = requestAnimationFrame(draw);
      }
      if (vortexAnim) cancelAnimationFrame(vortexAnim);
      draw();
    }

    let lastOrbTap = 0;
    orb.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastOrbTap < 500) return;
      lastOrbTap = now;
      X.sfx('chime');
      const bonus = X.qiRate() * 5;
      X.S.qi = Math.min(X.S.qi + bonus, X.qiNeed());
      X.save();
      updateHall();
      const r = orb.getBoundingClientRect();
      X.fx.floatText(r.left + r.width / 2, r.top, '+' + X.fmt(Math.floor(bonus)), '#64C8FF');
    });

    const stageLabels = ['一','二','三','四','五','六','七','八','九'];

    function updateHall() {
      const stats = X.stats();
      const realm = X.G.realms[X.S.realm];
      realmNameEl.textContent = realm ? realm.name : '';
      realmStageEl.textContent = (stageLabels[X.S.stage - 1] || X.S.stage) + '层';
      const need = X.qiNeed();
      const pct = X.S.qi / need;
      const circ = 2 * Math.PI * 54;
      ringProg.style.strokeDasharray = circ.toFixed(2);
      ringProg.style.strokeDashoffset = (circ - circ * Math.min(1, pct)).toFixed(2);
      atkEl.innerHTML = '⚔ 攻击 <span class="hl-stat-val">' + X.fmt(Math.floor(stats.atk)) + '</span>';
      defEl.innerHTML = '🛡 防御 <span class="hl-stat-val">' + X.fmt(Math.floor(stats.def)) + '</span>';
      hpEl.innerHTML = '❤ 血量 <span class="hl-stat-val">' + X.fmt(Math.floor(stats.hp)) + '</span>';
      X.refreshBalances();
      buildTechList();
    }

    function buildTechList() {
      techList.innerHTML = '';
      X.G.techniques.forEach(tech => {
        const lv = X.S.techniques[tech.id] || 0;
        const unlocked = X.S.realm >= tech.minRealm;
        const maxed = lv >= tech.maxLv;
        const cost = tech.cost(Math.max(1, lv));
        const card = document.createElement('div'); card.className = 'hl-tech-card';
        const info = document.createElement('div'); info.className = 'hl-tech-info';
        const nm = document.createElement('div'); nm.className = 'hl-tech-name';
        nm.textContent = tech.name + (lv > 0 ? ' Lv.' + lv : '');
        const ef = document.createElement('div'); ef.className = 'hl-tech-eff';
        ef.textContent = '灵气 +' + Math.round((tech.qiMult(Math.max(1,lv))-1)*100) + '%';
        info.appendChild(nm); info.appendChild(ef);
        const upBtn = document.createElement('button'); upBtn.className = 'hl-tech-up';
        if (!unlocked) { upBtn.textContent = '境界不足'; upBtn.disabled = true; }
        else if (maxed) { upBtn.textContent = '满级'; upBtn.disabled = true; }
        else { upBtn.textContent = '💠' + X.fmt(cost) + ' 升级'; }
        upBtn.addEventListener('click', () => {
          if (upBtn.disabled) return;
          if (!E.spend('lingshi', cost, 'upgrade_tech')) { X.toast('灵石不足', 'error'); return; }
          X.sfx('coin');
          X.S.techniques[tech.id] = lv + 1;
          X.save();
          X.toast(tech.name + ' 升至 Lv.' + (lv+1), 'success');
          updateHall();
        });
        card.appendChild(info); card.appendChild(upBtn);
        techList.appendChild(card);
      });
    }

    X.screens.hall = {
      el,
      enter() {
        if (D && D.scenes && D.scenes.hall) X.setBg(D.scenes.hall, true);
        dollWrap.innerHTML = '';
        X.Doll.render(dollWrap, Object.assign({}, X.S.equipped), { animate: false });
        updateHall();
        setTimeout(startVortex, 50);
      },
      leave() {
        if (vortexAnim) { cancelAnimationFrame(vortexAnim); vortexAnim = null; }
      },
      doBreak() {
        if (!X.canBreak()) { X.toast('修为未满，无法突破', 'error'); return; }
        X.sfx('click');
        const result = X.breakthrough();
        if (result.needTrib) { X.show('tribulation'); return; }
        breakBtn.disabled = true;
        const success = Math.random() < (result.rate > 1 ? 1 : result.rate);
        X.fx.ring(el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight * 0.5);
        X.fx.flash(success ? '#FFD700' : '#888888');
        X.sfx(success ? 'break' : 'fail');
        setTimeout(() => {
          X.applyBreak(success);
          if (success) {
            X.toast('突破成功！' + X.realmLabel(), 'success');
            X.fx.burst(el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight * 0.5, '#FFD700', 40);
          } else {
            X.toast('突破失败，灵气归零', 'error');
          }
          breakBtn.disabled = false;
          updateHall();
          if (X.screens.lobby && X.screens.lobby.refresh) X.screens.lobby.refresh();
        }, 800);
      }
    };
  })();

  (function buildTribulation() {
    const el = document.createElement('section');
    el.className = 'screen'; el.id = 'scr-tribulation';

    const hud = document.createElement('div'); hud.className = 'tb-hud';
    const titleEl = document.createElement('div'); titleEl.className = 'tb-title'; titleEl.textContent = '天劫降临';
    const hpBar = document.createElement('div'); hpBar.className = 'tb-hp-bar';
    const hpFill = document.createElement('div'); hpFill.className = 'tb-hp-fill';
    const hpText = document.createElement('div'); hpText.className = 'tb-hp-text';
    hpBar.appendChild(hpFill); hpBar.appendChild(hpText);
    const strikeCount = document.createElement('div'); strikeCount.className = 'tb-strike-count';
    hud.appendChild(titleEl); hud.appendChild(hpBar); hud.appendChild(strikeCount);

    const canvas = document.createElement('canvas'); canvas.className = 'tb-canvas';
    const warnCircle = document.createElement('div'); warnCircle.className = 'tb-warn-circle';
    const shieldBtn = document.createElement('button'); shieldBtn.className = 'tb-shield-btn'; shieldBtn.textContent = '护体';

    el.appendChild(hud); el.appendChild(canvas); el.appendChild(warnCircle); el.appendChild(shieldBtn);
    document.getElementById('screens').appendChild(el);

    let tribState = null;

    function startTrib() {
      tribState = { total: 5, current: 0, hp: 100, maxHp: 100, active: false, circleX: 0, circleY: 0, shrinkStart: 0, duration: 2200 };
      refreshHud();
      setTimeout(nextStrike, 800);
    }

    function refreshHud() {
      if (!tribState) return;
      const pct = (tribState.hp / tribState.maxHp) * 100;
      hpFill.style.width = pct + '%';
      hpText.textContent = Math.ceil(tribState.hp) + ' / ' + tribState.maxHp;
      strikeCount.textContent = '第 ' + (tribState.current + 1) + ' / ' + tribState.total + ' 道天劫';
    }

    function nextStrike() {
      if (!tribState) return;
      if (tribState.current >= tribState.total) { endTrib(); return; }
      tribState.active = true;
      tribState.circleX = el.offsetWidth * (0.2 + Math.random() * 0.6);
      tribState.circleY = el.offsetHeight * (0.25 + Math.random() * 0.4);
      tribState.shrinkStart = Date.now();
      warnCircle.style.display = 'block';
      warnCircle.style.left = tribState.circleX + 'px';
      warnCircle.style.top = tribState.circleY + 'px';
      warnCircle.style.width = '100px'; warnCircle.style.height = '100px';
      warnCircle.style.animation = 'none';
      void warnCircle.offsetWidth;
      warnCircle.style.animation = 'warnShrink ' + tribState.duration + 'ms linear forwards';
      const stateSnapshot = tribState;
      setTimeout(() => {
        if (tribState === stateSnapshot && tribState.active) strikeHit(false);
      }, tribState.duration);
    }

    function strikeHit(blocked) {
      if (!tribState || !tribState.active) return;
      tribState.active = false;
      warnCircle.style.display = 'none';
      drawLightning();
      X.fx.flash('#ffffff');
      X.fx.shake(300);
      X.sfx('thunder');
      if (!blocked) {
        const dmg = 12 + Math.random() * 10;
        tribState.hp = Math.max(0, tribState.hp - dmg);
        X.fx.floatText(el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight * 0.4, '-' + Math.ceil(dmg), '#FF4444');
      } else {
        X.fx.floatText(el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight * 0.4, '完美护体!', '#64C8FF');
      }
      tribState.current++;
      refreshHud();
      if (tribState.hp <= 0) { endTrib(); return; }
      setTimeout(nextStrike, 1200);
    }

    function drawLightning() {
      if (!tribState) return;
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#64C8FF'; ctx.lineWidth = 3 * dpr;
      ctx.shadowBlur = 18; ctx.shadowColor = '#64C8FF';
      ctx.beginPath();
      let x = tribState.circleX * dpr, y = 0;
      ctx.moveTo(x, y);
      const endY = tribState.circleY * dpr;
      while (y < endY) {
        x += (Math.random() - 0.5) * 36 * dpr;
        y += (20 + Math.random() * 18) * dpr;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      setTimeout(() => { const c = canvas.getContext('2d'); c.clearRect(0,0,canvas.width,canvas.height); }, 200);
    }

    function endTrib() {
      if (!tribState) return;
      const success = tribState.hp > 0;
      tribState = null;
      setTimeout(() => {
        X.applyBreak(success);
        X.fx.flash(success ? '#FFD700' : '#666666');
        const modal = X.modal('<div class="sa-modal"><h3>' + (success ? '渡劫成功！' : '渡劫失败') + '</h3><p style="text-align:center;margin:10px 0;color:rgba(255,255,255,0.85);font-size:14px">' + (success ? '成功突破至 ' + X.realmLabel() + '！道途无阻。' : '天劫之威，非同小可，灵气归零。') + '</p><button class="sa-btn sa-btn-gold" id="tribOk" style="display:block;width:100%;margin-top:12px">确定</button></div>', {});
        const ok = modal.el.querySelector('#tribOk');
        if (ok) ok.addEventListener('click', () => { X.sfx('click'); modal.close(); X.show('hall'); });
      }, 500);
    }

    shieldBtn.addEventListener('click', () => {
      if (!tribState || !tribState.active) return;
      const elapsed = Date.now() - tribState.shrinkStart;
      const remaining = tribState.duration - elapsed;
      X.sfx('click');
      strikeHit(remaining < 350);
    });

    X.screens.tribulation = {
      el,
      enter() {
        if (D && D.scenes && D.scenes.tribulation) X.setBg(D.scenes.tribulation, false);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = el.offsetWidth * dpr;
        canvas.height = el.offsetHeight * dpr;
        canvas.style.width = el.offsetWidth + 'px';
        canvas.style.height = el.offsetHeight + 'px';
        tribState = null;
        warnCircle.style.display = 'none';
        startTrib();
      },
      leave() {
        tribState = null;
        warnCircle.style.display = 'none';
      }
    };
  })();

  function showSignin() {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const sg = X.S.signin || { last: null, day: 0 };
    let day = sg.day || 0;
    if (sg.last !== today) {
      day = sg.last === yesterday ? Math.min((day % 7) + 1, 7) : 1;
    }
    const rewards = [
      { d: 1, ls: 100, gm: 0 }, { d: 2, ls: 200, gm: 0 },
      { d: 3, ls: 300, gm: 5 }, { d: 4, ls: 400, gm: 0 },
      { d: 5, ls: 500, gm: 10 }, { d: 6, ls: 800, gm: 0 },
      { d: 7, ls: 1000, gm: 20 }
    ];

    const wrap = document.createElement('div'); wrap.className = 'sa-modal';
    const h = document.createElement('h3'); h.textContent = '每日签到'; wrap.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'sg-grid';
    rewards.forEach(r => {
      const cell = document.createElement('div'); cell.className = 'sg-day';
      if (r.d === day && sg.last !== today) cell.classList.add('sg-current');
      if (r.d < day || (r.d === day && sg.last === today)) cell.classList.add('sg-claimed');
      const lbl = document.createElement('div'); lbl.className = 'sg-day-lbl'; lbl.textContent = '第' + r.d + '天';
      const rew = document.createElement('div'); rew.className = 'sg-day-r'; rew.textContent = '💠' + r.ls;
      cell.appendChild(lbl); cell.appendChild(rew);
      if (r.gm > 0) { const g = document.createElement('div'); g.className = 'sg-day-r'; g.textContent = '💎' + r.gm; cell.appendChild(g); }
      if (r.d < day || (r.d === day && sg.last === today)) {
        const chk = document.createElement('div'); chk.className = 'sg-check'; chk.textContent = '✓'; cell.appendChild(chk);
      }
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    const canClaim = sg.last !== today;
    const modalObj = X.modal(wrap.outerHTML, {});
    if (canClaim) {
      const claimBtn = document.createElement('button'); claimBtn.className = 'sa-btn sa-btn-gold';
      claimBtn.textContent = '签到领取'; claimBtn.style.cssText = 'display:block;width:100%;margin-top:10px';
      modalObj.el.appendChild(claimBtn);
      claimBtn.addEventListener('click', () => {
        X.sfx('coin');
        const r = rewards[day - 1] || rewards[0];
        E.add('lingshi', r.ls, 'signin');
        if (r.gm > 0) E.add('gem', r.gm, 'signin');
        X.S.signin = { last: today, day };
        X.save();
        X.toast('签到成功！💠' + r.ls + (r.gm > 0 ? ' 💎'+r.gm : ''), 'success');
        modalObj.close();
        X.refreshBalances();
      });
    } else {
      const done = document.createElement('p'); done.textContent = '今日已签到';
      done.style.cssText = 'text-align:center;color:rgba(255,235,150,0.7);margin-top:10px;font-size:13px';
      modalObj.el.appendChild(done);
    }
  }

  function showMissions() {
    const today = new Date().toISOString().slice(0, 10);
    let ms = X.S.missions;
    if (!ms || ms.date !== today) {
      const pool = X.G.missionsPool.slice();
      pool.sort(() => Math.random() - 0.5);
      const sel = pool.slice(0, 3).map(m => ({
        id: m.id, type: m.type, name: m.name, desc: m.desc,
        reward: m.reward, target: m.target, prog: 0, done: false, claimed: false
      }));
      ms = { date: today, list: sel };
      X.S.missions = ms; X.save();
    }

    const modal = X.modal('', {});
    modal.el.innerHTML = '';

    const wrap = document.createElement('div'); wrap.className = 'sa-modal';
    const h = document.createElement('h3'); h.textContent = '每日任务'; wrap.appendChild(h);
    const list = document.createElement('div'); list.className = 'ms-list';
    ms.list.forEach((m, idx) => {
      const pct = Math.min(100, (m.prog / m.target) * 100);
      const card = document.createElement('div'); card.className = 'ms-card' + (m.claimed ? ' ms-claimed' : '');
      const info = document.createElement('div'); info.className = 'ms-info';
      const nm = document.createElement('div'); nm.className = 'ms-name'; nm.textContent = m.name;
      const pg = document.createElement('div'); pg.className = 'ms-prog'; pg.textContent = m.prog + ' / ' + m.target;
      const bar = document.createElement('div'); bar.className = 'ms-bar';
      const fill = document.createElement('div'); fill.className = 'ms-bar-fill'; fill.style.width = pct + '%';
      bar.appendChild(fill); info.appendChild(nm); info.appendChild(pg); info.appendChild(bar);
      const rew = document.createElement('div'); rew.className = 'ms-reward';
      rew.textContent = m.reward.lingshi ? '💠' + m.reward.lingshi : m.reward.gems ? '💎' + m.reward.gems : '';
      card.appendChild(info); card.appendChild(rew);
      if (m.done && !m.claimed) {
        const clBtn = document.createElement('button'); clBtn.className = 'sa-btn sa-btn-gold ms-claim';
        clBtn.textContent = '领取';
        clBtn.addEventListener('click', () => {
          X.sfx('coin');
          if (m.reward.lingshi) E.add('lingshi', m.reward.lingshi, 'mission');
          if (m.reward.gems) E.add('gem', m.reward.gems, 'mission');
          m.claimed = true; X.save();
          clBtn.textContent = '✓'; clBtn.disabled = true;
          card.classList.add('ms-claimed');
          X.toast('任务奖励已领取', 'success');
          X.refreshBalances();
        });
        card.appendChild(clBtn);
      } else if (m.claimed) {
        const chk = document.createElement('div'); chk.style.cssText = 'font-size:18px;color:#64C8FF'; chk.textContent = '✓';
        card.appendChild(chk);
      }
      list.appendChild(card);
    });
    wrap.appendChild(list);
    modal.el.appendChild(wrap);
  }

  function showSettings() {
    const modal = X.modal('', {});
    modal.el.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'sa-modal';
    const h = document.createElement('h3'); h.textContent = '设置'; wrap.appendChild(h);

    const soundRow = document.createElement('div'); soundRow.className = 'st-item';
    const lbl = document.createElement('label'); lbl.textContent = '音效';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = X.S.settings.sound;
    chk.addEventListener('change', () => { X.S.settings.sound = chk.checked; X.save(); });
    soundRow.appendChild(lbl); soundRow.appendChild(chk); wrap.appendChild(soundRow);

    const actions = document.createElement('div'); actions.className = 'st-actions';
    const resetBtn = document.createElement('button'); resetBtn.className = 'sa-btn sa-btn-blue'; resetBtn.textContent = '重置数据';
    resetBtn.addEventListener('click', () => {
      if (confirm('确定重置全部数据？此操作不可恢复！')) { X._resetting = true; X.reset(); try { window.XianEconomy && XianEconomy.reset(); } catch (e) {} try { localStorage.removeItem('xiuxian-v1'); } catch (e) {} location.reload(); }
    });
    const closeBtn = document.createElement('button'); closeBtn.className = 'sa-btn sa-btn-gold'; closeBtn.textContent = '关闭';
    closeBtn.addEventListener('click', () => { X.sfx('click'); modal.close(); });
    actions.appendChild(resetBtn); actions.appendChild(closeBtn);
    wrap.appendChild(actions);
    modal.el.appendChild(wrap);
  }

  X.missionProgress = function (type, n) {
    const today = new Date().toISOString().slice(0, 10);
    const ms = X.S.missions;
    if (!ms || !ms.list || ms.date !== today) return;
    ms.list.forEach(m => {
      if (m.type === type && !m.done) {
        m.prog = Math.min(m.target, (m.prog || 0) + n);
        if (m.prog >= m.target) {
          m.done = true;
          X.toast('任务完成：' + m.name, 'success');
        }
      }
    });
    X.save();
  };

})();