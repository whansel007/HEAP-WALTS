// kana.js — hiragana/katakana board

const KANA_TABLE = [
  { romaji: 'a',  hira: 'あ', kata: 'ア' }, { romaji: 'i',  hira: 'い', kata: 'イ' },
  { romaji: 'u',  hira: 'う', kata: 'ウ' }, { romaji: 'e',  hira: 'え', kata: 'エ' },
  { romaji: 'o',  hira: 'お', kata: 'オ' },
  { romaji: 'ka', hira: 'か', kata: 'カ' }, { romaji: 'ki', hira: 'き', kata: 'キ' },
  { romaji: 'ku', hira: 'く', kata: 'ク' }, { romaji: 'ke', hira: 'け', kata: 'ケ' },
  { romaji: 'ko', hira: 'こ', kata: 'コ' },
  { romaji: 'sa', hira: 'さ', kata: 'サ' }, { romaji: 'shi',hira: 'し', kata: 'シ' },
  { romaji: 'su', hira: 'す', kata: 'ス' }, { romaji: 'se', hira: 'せ', kata: 'セ' },
  { romaji: 'so', hira: 'そ', kata: 'ソ' },
  { romaji: 'ta', hira: 'た', kata: 'タ' }, { romaji: 'chi',hira: 'ち', kata: 'チ' },
  { romaji: 'tsu',hira: 'つ', kata: 'ツ' }, { romaji: 'te', hira: 'て', kata: 'テ' },
  { romaji: 'to', hira: 'と', kata: 'ト' },
  { romaji: 'na', hira: 'な', kata: 'ナ' }, { romaji: 'ni', hira: 'に', kata: 'ニ' },
  { romaji: 'nu', hira: 'ぬ', kata: 'ヌ' }, { romaji: 'ne', hira: 'ね', kata: 'ネ' },
  { romaji: 'no', hira: 'の', kata: 'ノ' },
  { romaji: 'ha', hira: 'は', kata: 'ハ' }, { romaji: 'hi', hira: 'ひ', kata: 'ヒ' },
  { romaji: 'fu', hira: 'ふ', kata: 'フ' }, { romaji: 'he', hira: 'へ', kata: 'ヘ' },
  { romaji: 'ho', hira: 'ほ', kata: 'ホ' },
  { romaji: 'ma', hira: 'ま', kata: 'マ' }, { romaji: 'mi', hira: 'み', kata: 'ミ' },
  { romaji: 'mu', hira: 'む', kata: 'ム' }, { romaji: 'me', hira: 'め', kata: 'メ' },
  { romaji: 'mo', hira: 'も', kata: 'モ' },
  { romaji: 'ya', hira: 'や', kata: 'ヤ' }, { romaji: 'yu', hira: 'ゆ', kata: 'ユ' },
  { romaji: 'yo', hira: 'よ', kata: 'ヨ' },
  { romaji: 'ra', hira: 'ら', kata: 'ラ' }, { romaji: 'ri', hira: 'り', kata: 'リ' },
  { romaji: 'ru', hira: 'る', kata: 'ル' }, { romaji: 're', hira: 'れ', kata: 'レ' },
  { romaji: 'ro', hira: 'ろ', kata: 'ロ' },
  { romaji: 'wa', hira: 'わ', kata: 'ワ' }, { romaji: 'wo', hira: 'を', kata: 'ヲ' },
  { romaji: 'n',  hira: 'ん', kata: 'ン' },

  // ── Dakuten (゛) ──
  { romaji: 'ga', hira: 'が', kata: 'ガ' }, { romaji: 'gi', hira: 'ぎ', kata: 'ギ' },
  { romaji: 'gu', hira: 'ぐ', kata: 'グ' }, { romaji: 'ge', hira: 'げ', kata: 'ゲ' },
  { romaji: 'go', hira: 'ご', kata: 'ゴ' },
  { romaji: 'za', hira: 'ざ', kata: 'ザ' }, { romaji: 'ji', hira: 'じ', kata: 'ジ' },
  { romaji: 'zu', hira: 'ず', kata: 'ズ' }, { romaji: 'ze', hira: 'ぜ', kata: 'ゼ' },
  { romaji: 'zo', hira: 'ぞ', kata: 'ゾ' },
  { romaji: 'da', hira: 'だ', kata: 'ダ' }, { romaji: 'dji',hira: 'ぢ', kata: 'ヂ' },
  { romaji: 'dzu',hira: 'づ', kata: 'ヅ' }, { romaji: 'de', hira: 'で', kata: 'デ' },
  { romaji: 'do', hira: 'ど', kata: 'ド' },
  { romaji: 'ba', hira: 'ば', kata: 'バ' }, { romaji: 'bi', hira: 'び', kata: 'ビ' },
  { romaji: 'bu', hira: 'ぶ', kata: 'ブ' }, { romaji: 'be', hira: 'べ', kata: 'ベ' },
  { romaji: 'bo', hira: 'ぼ', kata: 'ボ' },

  // ── Handakuten (゜) ──
  { romaji: 'pa', hira: 'ぱ', kata: 'パ' }, { romaji: 'pi', hira: 'ぴ', kata: 'ピ' },
  { romaji: 'pu', hira: 'ぷ', kata: 'プ' }, { romaji: 'pe', hira: 'ぺ', kata: 'ペ' },
  { romaji: 'po', hira: 'ぽ', kata: 'ポ' },
];

const kanaState = {};
KANA_TABLE.forEach(k => { kanaState[k.romaji] = 'hira'; });

function renderKanaGrid() {
  const grid = document.getElementById('kana-grid');
  if (!grid) return;
  grid.innerHTML = KANA_TABLE.map(k => {
    const mode = kanaState[k.romaji];
    const char = mode === 'hira' ? k.hira : k.kata;
    return `
      <div class="kana-tile ${mode === 'kata' ? 'katakana' : ''}" data-romaji="${k.romaji}">
        <span class="kana-char">${char}</span>
        <span class="kana-romaji">${k.romaji}</span>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.kana-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const romaji = tile.dataset.romaji;
      kanaState[romaji] = kanaState[romaji] === 'hira' ? 'kata' : 'hira';
      renderKanaGrid();
    });
  });
}

function openKanaModal() {
  renderKanaGrid();
  document.getElementById('kana-modal').classList.remove('hidden');
}

function closeKanaModal() {
  document.getElementById('kana-modal').classList.add('hidden');
}

function initKanaBoard() {
  document.getElementById('kana-btn').addEventListener('click', openKanaModal);
  document.getElementById('kana-close').addEventListener('click', closeKanaModal);
  document.getElementById('kana-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('kana-modal')) closeKanaModal();
  });
}