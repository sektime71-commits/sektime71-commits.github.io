(()=>{async function zakonAudit(doc, loc, fetchFn) {
const out = [];
const add = (id, status, title, why, where, found, expected) =>
out.push({ id, status, title, why, evidence: { where, found, expected } });
const txt = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '');
const short = (s, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const hidden = (el) => {
for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
if (e.hidden || e.getAttribute('aria-hidden') === 'true') return true;
const cs = doc.defaultView && doc.defaultView.getComputedStyle ? doc.defaultView.getComputedStyle(e) : null;
if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return true;
}
return false;
};
const describe = (el) => {
const id = el.id ? '#' + el.id : '';
const name = el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : '';
return el.tagName.toLowerCase() + id + name;
};
const around = (cb) => {
let s = '';
if (cb.id) {
const l = doc.querySelector(`label[for="${cb.id.replace(/"/g, '\\"')}"]`);
if (l) s = txt(l);
}
if (!s && cb.closest('label')) s = txt(cb.closest('label'));
let p = cb.parentElement;
for (let i = 0; !s && p && i < 3; i++, p = p.parentElement) s = txt(p);
return s;
};
const linksAround = (cb) => {
const box = cb.closest('label') || cb.parentElement;
let p = box;
for (let i = 0; p && i < 3; i++, p = p.parentElement) {
const a = [...p.querySelectorAll('a[href]')];
if (a.length) return a;
}
return [];
};
const pageUrl = loc.href;
const html = doc.documentElement.outerHTML;
const allText = txt(doc.body);
if (loc.protocol === 'https:') add('05.2', 'ok', 'Сайт открыт по HTTPS', '', pageUrl, 'https', 'https');
else add('05.2', 'fix', 'Сайт открыт без HTTPS', 'Данные из форм передаются в открытом виде — это нарушение обязанности оператора защищать ПДн (ст. 19 152-ФЗ).', pageUrl, loc.protocol, 'https:');
const PD = /(name|fio|phone|tel|e-?mail|mail|имя|фио|телефон|почт)/i;
const pdFields = (f) =>
[...f.querySelectorAll('input, textarea')].filter((i) => {
if (hidden(i)) return false;
const t = (i.getAttribute('type') || 'text').toLowerCase();
if (t === 'email' || t === 'tel') return true;
if (!['text', ''].includes(t) && i.tagName !== 'TEXTAREA') return false;
const sig = [i.name, i.id, i.placeholder, i.getAttribute('autocomplete'), i.getAttribute('aria-label')].join(' ');
return PD.test(sig);
});
const forms = [...doc.querySelectorAll('form')].filter((f) => !hidden(f) && pdFields(f).length);
const FOREIGN_FORMS = /(docs\.google\.com\/forms|forms\.gle|typeform\.com|jotform\.com|forms\.office\.com|tally\.so|hsforms|hubspot)/i;
const foreignFrames = [...doc.querySelectorAll('iframe[src]')].filter((f) => FOREIGN_FORMS.test(f.src));
if (!forms.length) {
add('01.1', 'na', 'Формы со сбором данных на этой странице не найдены', 'Запустите проверку на странице с формой: заявка, обратный звонок, оформление заказа, подписка.', pageUrl, 'нет полей имя/телефон/email', 'форма с ПДн');
} else {
add('01.1', 'ok', `Найдено форм со сбором ПДн: ${forms.length}`, '', pageUrl, forms.map((f) => `${describe(f)}: ${pdFields(f).map(describe).join(', ')}`).join('; '), '—');
forms.forEach((f, n) => {
const label = `Форма ${n + 1} (${describe(f)})`;
const boxes = [...f.querySelectorAll('input[type=checkbox]')];
const consent = boxes.filter((b) => /(персональн|обработк|согласи)/i.test(around(b)));
if (!consent.length) {
add('01.2', 'fix', `${label}: нет отметки согласия на обработку ПДн`, 'С 1 сентября 2025 согласие оформляется отдельно от иных документов (ч. 1 ст. 9 152-ФЗ в ред. 156-ФЗ). Без явного действия пользователя согласие не получено. Штраф — ч. 2 ст. 13.11 КоАП.', label, boxes.length ? `чекбоксы: ${boxes.map((b) => short(around(b), 60)).join(' | ')}` : 'чекбоксов нет', 'чекбокс «Даю согласие на обработку персональных данных» со ссылкой на текст согласия');
return;
}
add('01.2', 'ok', `${label}: есть отметка согласия`, '', label, short(around(consent[0])), '—');
const pre = consent.filter((b) => b.checked || b.hasAttribute('checked'));
if (pre.length) add('01.3', 'fix', `${label}: галочка согласия стоит заранее`, 'Согласие должно быть конкретным, информированным и сознательным (ч. 1 ст. 9 152-ФЗ). Заранее проставленная галочка — не действие пользователя.', label, `${describe(pre[0])} checked`, 'галочка снята по умолчанию');
else add('01.3', 'ok', `${label}: галочка не проставлена заранее`, '', label, 'unchecked', 'unchecked');
const ctext = around(consent[0]);
const mixed = /(оферт|пользовательск\w* соглашени|услови\w* договор)/i.test(ctext);
const links = linksAround(consent[0]);
const consentLink = links.find((a) => /согласи/i.test(txt(a) + ' ' + a.getAttribute('href')));
if (mixed) add('01.4', 'fix', `${label}: согласие совмещено с офертой/соглашением`, 'Согласие на обработку ПДн нельзя совмещать с акцептом оферты или другими документами — нужен отдельный чекбокс и отдельный текст согласия (ч. 1 ст. 9 152-ФЗ в ред. с 01.09.2025).', label, short(ctext), 'отдельный чекбокс только для согласия на обработку ПДн');
else if (!consentLink) add('01.4', 'check', `${label}: не найдена ссылка на отдельный текст согласия`, 'Рядом с галочкой ссылка ведёт только на политику (или ссылок нет). Текст согласия должен быть отдельным документом с целями, перечнем данных, третьими лицами и сроком.', label, links.length ? links.map((a) => `${short(txt(a), 40)} → ${a.getAttribute('href')}`).join('; ') : 'ссылок рядом нет', 'ссылка на страницу «Согласие на обработку персональных данных»');
else add('01.4', 'ok', `${label}: есть ссылка на отдельный текст согласия`, '', label, consentLink.getAttribute('href'), '—');
if (/(рассылк|новост|акци|подписк|спецпредложени)/i.test(txt(f))) {
const mail = boxes.filter((b) => b !== consent[0] && /(рассылк|новост|акци|реклам|подписк)/i.test(around(b)));
if (!mail.length && !/(рассылк|реклам)/i.test(ctext)) add('01.5', 'check', `${label}: форма похожа на подписку, отдельного согласия на рекламу нет`, 'Рекламная рассылка допускается только с предварительного согласия адресата (ч. 1 ст. 18 38-ФЗ «О рекламе»). Его лучше брать отдельной галочкой.', label, short(txt(f), 100), 'отдельная галочка «Согласен получать рекламные рассылки»');
else if (!mail.length && /(рассылк|реклам)/i.test(ctext)) add('01.5', 'fix', `${label}: согласие на рассылку объединено с согласием на ПДн`, 'Согласие на рекламу и согласие на обработку ПДн — разные согласия с разными основаниями (38-ФЗ и 152-ФЗ); объединять их в одну галочку нельзя.', label, short(ctext), 'две отдельные галочки');
else add('01.5', 'ok', `${label}: отдельная галочка на рассылку есть`, '', label, short(around(mail[0]), 80), '—');
}
const action = f.getAttribute('action') || '';
if (/^http:\/\//i.test(action)) add('01.6', 'fix', `${label}: данные отправляются по HTTP`, 'Форма отправляет данные без шифрования (ст. 19 152-ФЗ).', label, action, 'https://…');
});
}
if (foreignFrames.length) add('03.4', 'fix', 'Форма на иностранном сервисе', 'Первичный сбор ПДн граждан РФ должен идти в базы на территории РФ (ч. 5 ст. 18 152-ФЗ). Встроенная форма Google/Typeform и т. п. собирает данные сразу за рубеж. Штраф — ч. 8 ст. 13.11 КоАП (для юрлиц от 1 млн ₽).', pageUrl, foreignFrames.map((f) => f.src).join('; '), 'форма на своём сервере или российском сервисе');
const anchors = [...doc.querySelectorAll('a[href]')];
const policy = anchors.find((a) => /политик\w*.{0,40}(конфиденциальн|персональн|обработк)|privacy/i.test(txt(a) + ' ' + a.getAttribute('href')));
if (!policy) {
add('02.1', forms.length ? 'fix' : 'check', 'Не найдена ссылка на политику обработки ПДн', 'Оператор, собирающий ПДн через сайт, обязан опубликовать политику на страницах, где собираются данные (ч. 2 ст. 18.1 152-ФЗ). Штраф — ч. 3 ст. 13.11 КоАП.', pageUrl, 'ссылки со словами «политика конфиденциальности/обработки ПДн» нет', 'ссылка на политику в подвале и у каждой формы');
} else {
const href = new URL(policy.getAttribute('href'), pageUrl);
add('02.1', 'ok', 'Ссылка на политику есть', '', pageUrl, `${short(txt(policy), 60)} → ${href.href}`, '—');
if (href.origin !== loc.origin) {
add('02.2', 'na', 'Политика на другом домене — не открываю', 'Проверка читает только страницы этого сайта.', href.href, 'другой домен', '—');
} else if (/\.pdf($|\?)/i.test(href.pathname)) {
add('02.2', 'check', 'Политика опубликована PDF-файлом', 'Проверьте вручную, что PDF открывается и содержит реквизиты оператора.', href.href, 'PDF', 'HTML-страница или PDF с реквизитами');
} else {
let ptext = '', status = 0;
const probe = fetchFn ? await Promise.resolve(fetchFn(href.href)).catch(() => undefined) : null;
if (probe === null) {
add('02.2', 'na', 'Политика не открывалась', 'Проверялся вставленный код страницы — другие страницы сайта не открываем. Откройте политику и проверьте её тем же способом.', href.href, 'не проверялось', '—');
} else {
try {
if (!probe) throw new Error('fetch failed');
status = probe.status;
const h = await probe.text();
const d = new DOMParser().parseFromString(h, 'text/html');
d.querySelectorAll('script,style,noscript').forEach((e) => e.remove());
ptext = txt(d.body);
} catch (e) {
status = -1;
}
if (status !== 200) add('02.2', 'fix', 'Страница политики не открывается', 'Политика должна быть доступна (ч. 2 ст. 18.1 152-ФЗ).', href.href, status === -1 ? 'ошибка загрузки' : `HTTP ${status}`, 'HTTP 200');
else if (ptext.length < 1500) add('02.2', 'check', 'Политика подозрительно короткая', 'В политике должны быть цели, категории данных, сроки, права субъекта, меры защиты.', href.href, `${ptext.length} символов`, 'полноценный документ');
else {
add('02.2', 'ok', 'Политика открывается', '', href.href, `${ptext.length} символов`, '—');
const req = ptext.match(/(ИНН|ОГРНИП|ОГРН)\D{0,10}\d{10,15}/);
if (req) add('02.3', 'ok', 'В политике указан оператор с реквизитами', '', href.href, req[0], '—');
else add('02.3', 'check', 'В политике не найдены ИНН/ОГРН оператора', 'Из политики должно быть понятно, кто оператор. Без реквизитов это частая претензия РКН.', href.href, 'ИНН/ОГРН не найдены', 'наименование оператора, ИНН, ОГРН/ОГРНИП, адрес');
if (!/(cookie|куки|метрик|аналитик)/i.test(ptext)) add('02.4', 'check', 'Политика не упоминает cookie и аналитику', 'Если на сайте стоят счётчики, политика должна описывать обработку cookie и метрических данных.', href.href, 'нет слов cookie/метрика', 'раздел о cookie и счётчиках');
else add('02.4', 'ok', 'Политика описывает cookie/аналитику', '', href.href, 'упоминание найдено', '—');
}
}
}
}
const scripts = [...doc.querySelectorAll('script')].map((s) => (s.src || '') + ' ' + (s.src ? '' : (s.textContent || '').slice(0, 4000))).join(' ') + ' ' + [...doc.querySelectorAll('iframe[src],img[src]')].map((e) => e.src).join(' ');
const TRACKERS = [
['Яндекс Метрика', /mc\.yandex\.(ru|com)|ym\(\s*\d+/i, false],
['Top.Mail.Ru / VK', /top-fwz1\.mail\.ru|vk\.com\/rtrg|vk\.ru\/rtrg/i, false],
['Google Analytics', /google-analytics\.com|gtag\(\s*['"]config['"]\s*,\s*['"](G|UA)-/i, true],
['Google Tag Manager', /googletagmanager\.com/i, true],
['Meta (Facebook) Pixel', /connect\.facebook\.net|fbq\(/i, true],
['Google reCAPTCHA', /google\.com\/recaptcha|gstatic\.com\/recaptcha/i, true],
['Hotjar', /hotjar\.com/i, true],
['Microsoft Clarity', /clarity\.ms/i, true],
];
const found = TRACKERS.filter(([, re]) => re.test(scripts));
if (!found.length) add('03.1', 'ok', 'Счётчики аналитики не обнаружены', '', pageUrl, 'нет', '—');
else add('03.1', 'ok', `Обнаружены сервисы: ${found.map((t) => t[0]).join(', ')}`, 'Информационно: эти сервисы ставят cookie и собирают данные о посетителях.', pageUrl, found.map((t) => t[0]).join(', '), '—');
const foreign = found.filter((t) => t[2]);
if (foreign.length) add('03.4', 'check', `Иностранные сервисы сбора данных: ${foreign.map((t) => t[0]).join(', ')}`, 'С 1 июля 2025 первичный сбор ПДн граждан РФ — только в базы на территории РФ (ч. 5 ст. 18 152-ФЗ); трансграничная передача требует уведомления РКН. Риск штрафа по ч. 8 ст. 13.11 КоАП. Нужна оценка: собирает ли сервис ПДн и есть ли уведомление.', pageUrl, foreign.map((t) => t[0]).join(', '), 'российские аналоги или оформленная трансграничная передача');
const bannerEls = [...doc.querySelectorAll('div,section,aside,footer,dialog,p')].filter((e) => {
const t = txt(e);
return t.length < 600 && /(cookie|куки|файл\w* cookie)/i.test(t) && e.querySelector('button,a,[role=button],input[type=button]');
});
if (found.length) {
if (!bannerEls.length) add('03.2', 'check', 'Счётчики есть, уведомления о cookie не видно', 'Прямой нормы о баннере в законе нет, но РКН рассматривает данные счётчиков как ПДн; без уведомления и согласия это главный риск при автоматических проверках. Баннер также мог не появиться, если вы его уже закрыли — проверьте в режиме инкогнито.', pageUrl, 'баннер не найден', 'баннер до запуска счётчиков, со ссылкой на политику cookie');
else {
const b = bannerEls.sort((a, c) => txt(a).length - txt(c).length)[0];
add('03.2', 'ok', 'Уведомление о cookie есть', '', pageUrl, short(txt(b)), '—');
const btns = [...b.querySelectorAll('button,a,[role=button],input[type=button]')].map((x) => txt(x) || x.value || '');
if (!btns.some((t) => /(отклон|отказ|настро|только необходим|запрет|decline|reject)/i.test(t))) add('03.3', 'check', 'В баннере нет выбора — только «Принять/ОК»', 'Согласие должно быть свободным: у пользователя должна быть возможность отказаться от необязательных cookie.', pageUrl, btns.join(' | ') || 'кнопки без текста', 'кнопки «Принять» и «Отклонить/Настроить»');
else add('03.3', 'ok', 'В баннере есть выбор', '', pageUrl, btns.join(' | '), '—');
}
}
const UI = [...doc.querySelectorAll('nav a, header a, header button, button, [role=button], input[type=submit], .menu a, footer a')].filter((e) => !hidden(e));
const latin = new Set();
UI.forEach((e) => {
const t = (txt(e) || e.value || '').trim();
if (!t || t.length > 40) return;
if (/[а-яё]/i.test(t)) return; // есть кириллица — дубль/русский текст
if (/^[\W\d_]+$/.test(t)) return; // иконки, цифры
if (/^(ok|faq|pdf|vk|tg|whatsapp|telegram|youtube|rutube|instagram|dzen|email|e-mail)$/i.test(t)) return;
if (/[a-z]{3,}/i.test(t)) latin.add(t);
});
const lw = [...latin].slice(0, 15);
if (lw.length) add('04.1', 'check', `Элементы интерфейса только латиницей: ${lw.length}`, 'С 1 марта 2026 информация для потребителей должна быть на русском языке; иностранный текст — только как равнозначный дубль. Исключение — зарегистрированные товарные знаки и фирменные наименования. Проверьте, какие из слов ниже не являются вашим товарным знаком.', pageUrl, lw.join(' | '), 'русский текст (например «Sale» → «Распродажа»)');
else add('04.1', 'ok', 'Меню и кнопки на русском', '', pageUrl, `${UI.length} элементов проверено`, '—');
const reqOnPage = allText.match(/(ИНН|ОГРНИП|ОГРН)\D{0,10}\d{10,15}/);
if (reqOnPage) add('05.1', 'ok', 'Реквизиты продавца на странице есть', '', pageUrl, reqOnPage[0], '—');
else add('05.1', 'check', 'На этой странице не видно ИНН/ОГРН продавца', 'Интернет-магазин обязан раскрыть наименование, адрес и ОГРН продавца (ст. 9 и ст. 26.1 Закона о защите прав потребителей). Обычно их ставят в подвал — проверьте, есть ли они на сайте.', pageUrl, 'не найдены', 'наименование/ФИО ИП, ОГРН(ИП), ИНН, адрес');
void html;
return out;
}
(async () => {
const LANDING = 'https://sektime71-commits.github.io/zakon/';
const old = document.getElementById('zakon-audit-host');
if (old) old.remove();
const host = document.createElement('div');
host.id = 'zakon-audit-host';
host.style.cssText = 'position:fixed;inset:auto 16px 16px auto;z-index:2147483647;';
document.documentElement.appendChild(host);
const root = host.attachShadow({ mode: 'open' });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
root.innerHTML = `<style>
:host{all:initial}
.p{font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1b1f1c;background:#fff;border:1px solid #d9ddd6;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.25);width:min(440px,calc(100vw - 32px));max-height:min(80vh,720px);display:flex;flex-direction:column;overflow:hidden}
header{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e6e9e3;background:#f5f6f3}
header b{flex:1;font-size:15px}
button{font:inherit;border:1px solid #c9cfc6;background:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;color:#1b1f1c}
button.x{border:0;background:none;font-size:18px;padding:0 4px}
.sum{display:flex;gap:6px;padding:10px 14px;flex-wrap:wrap}
.chip{border-radius:999px;padding:2px 10px;font-weight:600;font-size:13px}
.fix{background:#fde2e1;color:#8a1c17}.check{background:#fff1c7;color:#6b4e00}.ok{background:#dcf2e5;color:#165a37}.na{background:#eceeea;color:#5d665f}
.list{overflow:auto;padding:0 14px 8px}
.f{border-top:1px solid #eef0ec;padding:9px 0}
.f .h{display:flex;gap:8px;align-items:flex-start}
.f .h span{flex-shrink:0;font-size:11px;padding:1px 7px;margin-top:2px}
.f .t{font-weight:600}
.f p{margin:4px 0 0;color:#4a524c;font-size:13px}
.ev{margin-top:4px;font:12px/1.4 ui-monospace,Menlo,monospace;background:#f5f6f3;border-radius:6px;padding:6px 8px;overflow-wrap:anywhere;color:#333}
footer{padding:10px 14px;border-top:1px solid #e6e9e3;font-size:12px;color:#5d665f;background:#f5f6f3}
footer a{color:#1f6f4a;font-weight:600}
details summary{cursor:pointer;color:#5d665f;padding:8px 0}
</style><div class="p"><header><b>Сайт по закону</b><button class="cp">Скопировать отчёт</button><button class="x" title="Закрыть">×</button></header><div class="sum">Проверяю…</div><div class="list"></div>
<footer>Автоматическая проверка одной страницы — не юридическое заключение. Данные никуда не отправляются. Полный ручной аудит всего сайта: <a href="${LANDING}" target="_blank" rel="noopener">подробнее</a></footer></div>`;
root.querySelector('.x').onclick = () => host.remove();
let res;
try {
res = await zakonAudit(document, location, (u) => fetch(u, { credentials: 'omit' }));
} catch (e) {
root.querySelector('.sum').textContent = 'Не удалось проверить страницу: ' + e.message;
return;
}
const order = { fix: 0, check: 1, ok: 2, na: 3 };
const names = { fix: 'Исправить', check: 'Проверить', ok: 'В порядке', na: 'Неприменимо' };
res.sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id));
const cnt = (s) => res.filter((f) => f.status === s).length;
root.querySelector('.sum').innerHTML = ['fix', 'check', 'ok'].map((s) => `<span class="chip ${s}">${names[s]}: ${cnt(s)}</span>`).join('');
const card = (f) => `<div class="f"><div class="h"><span class="chip ${f.status}">${names[f.status]}</span><div><div class="t">${esc(f.id)} · ${esc(f.title)}</div>${f.why ? `<p>${esc(f.why)}</p>` : ''}${f.status === 'fix' || f.status === 'check' ? `<div class="ev">Где: ${esc(f.evidence.where)}<br>Найдено: ${esc(f.evidence.found)}<br>Нужно: ${esc(f.evidence.expected)}</div>` : ''}</div></div></div>`;
const main = res.filter((f) => f.status === 'fix' || f.status === 'check');
const rest = res.filter((f) => f.status === 'ok' || f.status === 'na');
root.querySelector('.list').innerHTML = (main.length ? main.map(card).join('') : '<p>Явных проблем на этой странице не найдено.</p>') + (rest.length ? `<details><summary>В порядке и неприменимо (${rest.length})</summary>${rest.map(card).join('')}</details>` : '');
root.querySelector('.cp').onclick = async (ev) => {
const lines = [`Проверка «Сайт по закону»: ${location.href}`, `Дата: ${new Date().toLocaleString('ru-RU')}`, `Исправить: ${cnt('fix')}, проверить: ${cnt('check')}, в порядке: ${cnt('ok')}`, ''];
res.forEach((f) => lines.push(`[${names[f.status]}] ${f.id} ${f.title}`, ...(f.status === 'fix' || f.status === 'check' ? [`  Найдено: ${f.evidence.found}`, `  Нужно: ${f.evidence.expected}`] : [])));
lines.push('', 'Автоматическая проверка одной страницы, не юридическое заключение. ' + LANDING);
try { await navigator.clipboard.writeText(lines.join('\n')); ev.target.textContent = 'Скопировано'; } catch { ev.target.textContent = 'Не удалось'; }
};
})();
window.__zakonAudit = zakonAudit;
})();