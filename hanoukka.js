(function () {
  // Petits dessins de fête (originaux) : étoile de David, toupie (sevivon), beignet
  const etoile = (c) => `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 2 L21 18 L3 18Z M12 22 L3 6 L21 6Z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  const toupie = (x, y, c) => `<g transform="translate(${x},${y})"><rect x="-1.5" y="-8" width="3" height="8" fill="#d4a93a"/><path d="M-10 0 H10 V12 L0 24 L-10 12Z" fill="${c}" stroke="#fff" stroke-width="1.2"/><text x="0" y="13" font-size="10" text-anchor="middle" fill="#fff" font-family="serif">ש</text></g>`;
  const beignet = (x, y) => `<g transform="translate(${x},${y})"><ellipse cx="0" cy="8" rx="12" ry="9" fill="#d99a4e"/><ellipse cx="0" cy="5" rx="11" ry="6" fill="#fff" opacity=".9"/><circle cx="0" cy="3" r="3" fill="#c0283a"/></g>`;
  const etoileSvg = (x, y, c) => `<path transform="translate(${x},${y})" d="M0 -10 L9 6 L-9 6Z M0 10 L-9 -6 L9 -6Z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;

  // Bandeau
  const b = document.createElement("div"); b.className = "bandeau-fete";
  b.innerHTML = '<strong>Hag Hanoukka Saméa' + 'h !</strong> 🕎 Beignets en précommande : -10 % jusqu\'au 30 novembre · <a href="carte.html#hanoukka">Commander</a>';
  document.body.insertBefore(b, document.body.firstChild);

  // Guirlande sous l'en-tête
  const ent = document.getElementById("entete");
  if (ent) {
    const W = 1440, items = [];
    for (let i = 0, x = 30; x < W; i++, x += 90) {
      const fil = 10 + (i % 2) * 8, y = fil + 8;
      const deco = i % 3 === 0 ? etoileSvg(x, y + 10, i % 2 ? "#d4a93a" : "#2a56c6") : i % 3 === 1 ? toupie(x, y, i % 2 ? "#2a56c6" : "#0f2459") : beignet(x, y);
      items.push(`<g class="balance" style="transform-box:fill-box;animation-delay:${-i * .4}s"><line x1="${x}" y1="0" x2="${x}" y2="${y}" stroke="#d4a93a" stroke-width="1"/>${deco}</g>`);
    }
    const g = document.createElement("div"); g.className = "guirlande"; g.setAttribute("aria-hidden", "true");
    g.innerHTML = `<svg viewBox="0 0 ${W} 54" preserveAspectRatio="xMidYMin slice"><path d="M0 2 Q 360 14 720 2 T 1440 2" stroke="#d4a93a" fill="none" stroke-width="1.5"/>${items.join("")}</svg>`;
    ent.after(g);
  }

  // Étoiles de David et étincelles qui tombent sur l'accueil
  const h = document.querySelector(".heros");
  if (h) {
    const e = document.createElement("div"); e.className = "etincelles";
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("span");
      s.innerHTML = i % 3 === 0 ? etoile(i % 2 ? "#d4a93a" : "#ffffff") : `<i style="display:block;width:6px;height:6px;border-radius:50%;background:${i % 2 ? "#f5d77c" : "#cfe0ff"};box-shadow:0 0 8px 2px ${i % 2 ? "rgba(245,215,124,.8)" : "rgba(207,224,255,.9)"}"></i>`;
      s.style.left = (Math.random() * 100) + "%"; s.style.animationDuration = (7 + Math.random() * 8) + "s"; s.style.animationDelay = (-Math.random() * 14) + "s";
      e.appendChild(s);
    }
    h.appendChild(e);
  }

  // Hanoukia allumée + toupies dans la grande bande
  const cadre = document.querySelector(".bande-brune .deux-col > div");
  if (cadre) {
    const x = [20, 50, 80, 110, 190, 220, 250, 280];
    const bras = x.map((v) => `<path d="M${v} 70 Q${v} 120 150 128" fill="none" stroke="#d4a93a" stroke-width="4"/><rect x="${v - 5}" y="52" width="10" height="20" rx="2" fill="${v < 150 ? "#cfe0ff" : "#fff"}"/><path class="flamme" d="M${v} 32 C${v + 7} 42 ${v + 5} 52 ${v} 52 C${v - 5} 52 ${v - 7} 42 ${v} 32Z" fill="#ffc94d"/>`).join("");
    cadre.insertAdjacentHTML("beforeend", `<svg class="hanoukia-deco" viewBox="-40 0 380 190" role="img" aria-label="Hanoukia allumée">${bras}
      <rect x="146" y="40" width="8" height="90" fill="#d4a93a"/><rect x="144" y="26" width="12" height="16" rx="2" fill="#fff"/>
      <path class="flamme" d="M150 4 C158 14 156 24 150 24 C144 24 142 14 150 4Z" fill="#ffc94d"/>
      <path d="M120 175 L180 175 L165 130 L135 130Z" fill="#d4a93a"/>
      ${toupie(-18, 140, "#2a56c6")}${toupie(320, 140, "#d4a93a")}</svg>`);
  }
})();
