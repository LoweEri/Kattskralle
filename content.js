let ignoreraSetting=false,previewsSetting=false,infiniteScrollSetting=false,bypassLeavingSetting=false,markTsSetting=true;

function getThreadIdFromLocation(){try{const u=new URL(location.href);const m=u.pathname.match(/\/t(\d+)/);if(m)return m[1];const t=u.searchParams.get("t");if(t&&/^\d+$/.test(t))return t}catch(_){}return null}

function buildThreadPageUrl(pageNum){const u=new URL(location.href);let p=u.pathname;if(/\/t\d+(p\d+)?$/.test(p)){p=p.replace(/p\d+$/,"").replace(/\/$/,"");p+="p"+pageNum;return u.origin+p+(u.search||"")}const t=getThreadIdFromLocation();if(t)return u.origin+"/t"+t+"p"+pageNum+(u.search||"");return u.href}

function pickUsernameEl(root){const sels=[".post .post-user-username.dropdown-toggle",".post .post-user-username",".post .postuser",".post a[href^=\"/u\"]",".post .bigusername",".postheader .username",".post-heading .username"];for(const sel of sels){const el=root.querySelector(sel);if(el)return el}return null}

function extractTSFromDocument(doc){let first=doc.querySelector(".post")||doc.querySelector('[id^="post"]');if(first){const el=pickUsernameEl(first)||pickUsernameEl(doc);if(el){const name=(el.textContent||"").trim();if(name)return name}}const any=pickUsernameEl(doc);return any?(any.textContent||"").trim():null}

function markThreadStarter(ts){if(!ts)return;document.querySelectorAll('.post .post-user-username.dropdown-toggle, .post .post-user-username, .post .postuser, .post a[href^="/u"], .post .bigusername, .postheader .username, .post-heading .username').forEach(node=>{const name=(node.textContent||"").trim();if(name!==ts)return;if(!node.textContent.includes("(ts)")){const span=document.createElement("span");span.className="ks-ts-inline";span.textContent=" (ts)";node.appendChild(span)}})}

async function resolveThreadStarter(){const id=getThreadIdFromLocation();if(!id)return null;const r=await chrome.storage.local.get({threadStarters:{}});const map=r.threadStarters||{};if(map[id])return map[id];const url=buildThreadPageUrl(1);try{const resp=await fetch(url,{credentials:"include"});const html=await resp.text();const doc=new DOMParser().parseFromString(html,"text/html");const ts=extractTSFromDocument(doc);if(ts){map[id]=ts;await chrome.storage.local.set({threadStarters:map});return ts}}catch(e){}return null}

async function ensureThreadStarterMarked(){if(!markTsSetting)return;const ts=await resolveThreadStarter();if(ts)markThreadStarter(ts)}

function observeForNewPostsAndMarkTS(){if(!markTsSetting)return;const cont=document.querySelector("#posts, .posts, #content, body");if(!cont)return;let cached=null;(async()=>{const r=await chrome.storage.local.get({threadStarters:{}});const id=getThreadIdFromLocation();cached=id?r.threadStarters[id]:null;if(!cached)cached=await resolveThreadStarter();if(cached)markThreadStarter(cached)})();const mo=new MutationObserver(async m=>{if(!cached)cached=await resolveThreadStarter();if(cached){for(const rec of m){rec.addedNodes&&rec.addedNodes.forEach(n=>{if(!(n instanceof HTMLElement))return;if(n.matches&& (n.matches(".post")||n.querySelector?.(".post")))markThreadStarter(cached)})}}});mo.observe(cont,{childList:true,subtree:true})}

function loadSettings(saved){ignoreraSetting=saved["Ignorera"]??true;previewsSetting=saved["Previews"]??true;infiniteScrollSetting=saved["Infinite Scroll"]??true;bypassLeavingSetting=saved["Bypass Leaving Site"]??true;markTsSetting=saved["Markera Trådstartare"]??true}

chrome.storage.local.get("settings",res=>{const settings=res.settings||{};if(settings["Markera Trådstartare"]===undefined){settings["Markera Trådstartare"]=true;chrome.storage.local.set({settings},startTs)}else{startTs()}function startTs(){loadSettings(settings);ensureThreadStarterMarked();observeForNewPostsAndMarkTS()}});

chrome.storage.onChanged.addListener((changes,area)=>{if(area!=="local"||!changes.settings)return;const settings=changes.settings.newValue||{};loadSettings(settings);ensureThreadStarterMarked()});
