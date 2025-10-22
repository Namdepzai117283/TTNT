// main.js - vẽ bản đồ bằng click 2 điểm để nối, Dijkstra (optimal) + greedy heuristic,
// animation khi hiển thị đường đi, với layout cập nhật (from/to trên cùng + xóa nối + xóa tất cả)

const canvas = document.getElementById("cityMap");
const ctx = canvas.getContext("2d");

const cityNameInput = document.getElementById("cityName");
const addCityBtn = document.getElementById("addCityBtn");
const drawModeBtn = document.getElementById("drawModeBtn");
const delLinkModeBtn = document.getElementById("delLinkModeBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const fromSel = document.getElementById("fromSelect");
const toSel = document.getElementById("toSelect");

const greedyBtn = document.getElementById("greedyBtn");
const optimalBtn = document.getElementById("optimalBtn");
const resultEl = document.getElementById("result");

let cities = {};   // { name: {x,y} }
let links = [];    // [ {a,b,dist} ]
let radius = 36;
let dragging = null;
let offsetX = 0, offsetY = 0;

let drawMode = false;
let delLinkMode = false;
let linkFirst = null;    // for drawing / deleting connections

let animTimer = null;

// -------- helpers --------
function distBetween(A,B){
  return Math.hypot(A.x - B.x, A.y - B.y);
}
function findLink(a,b){
  return links.find(l => (l.a===a && l.b===b) || (l.a===b && l.b===a));
}
function updateSelects(){
  [fromSel,toSel].forEach(sel=>{
    const cur = sel.value;
    sel.innerHTML = "";
    for(const name in cities){
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    }
    // try to restore previous selection if still present
    if(cur && [...sel.options].some(o=>o.value===cur)) sel.value = cur;
  });
}

// -------- drawing --------
function drawGraph(highlightPath=[]){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw links (background grey) - no weights shown
  ctx.lineCap = "round";
  for(const l of links){
    const A = cities[l.a], B = cities[l.b];
    ctx.strokeStyle = "#c7cfd3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  }

  // draw highlighted path thicker & red (if provided)
  if(highlightPath && highlightPath.length>1){
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 6;
    ctx.beginPath();
    for(let i=0;i<highlightPath.length-1;i++){
      const A = cities[highlightPath[i]], B = cities[highlightPath[i+1]];
      ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y);
    }
    ctx.stroke();
  }

  // draw cities (circle + centered text)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "18px Arial";

  for(const name in cities){
    const p = cities[name];
    const isInPath = highlightPath.includes(name);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI*2);
    ctx.fillStyle = isInPath ? "#e74c3c" : "#2d9cdb";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1f2c33";
    ctx.stroke();

    // label inside circle
    ctx.fillStyle = "#fff";
    ctx.fillText(String(name), p.x, p.y);
  }
}

// -------- add / remove / reset --------
addCityBtn.addEventListener("click", ()=>{
  const name = cityNameInput.value.trim();
  if(!name){
    alert("Nhập tên thành phố trước!");
    return;
  }
  if(cities[name]){
    alert("Tên thành phố đã tồn tại!");
    return;
  }
  // place randomly near center
  const x = Math.random()*(canvas.width-200)+100;
  const y = Math.random()*(canvas.height-200)+100;
  cities[name] = {x,y};
  updateSelects();
  redraw();
  cityNameInput.value = "";
});

clearAllBtn.addEventListener("click", ()=>{
  if(animTimer){ clearInterval(animTimer); animTimer=null; }
  cities = {}; links = []; linkFirst = null;
  updateSelects(); redraw();
  resultEl.textContent = "";
  drawMode = false; delLinkMode = false;
  drawModeBtn.classList.remove("active"); delLinkModeBtn.classList.remove("active");
});

// toggle draw mode
drawModeBtn.addEventListener("click", ()=>{
  drawMode = !drawMode;
  delLinkMode = false;
  linkFirst = null;
  drawModeBtn.style.opacity = drawMode ? "1" : "0.86";
  delLinkModeBtn.style.opacity = "0.86";
  drawModeBtn.classList.toggle("active", drawMode);
  delLinkModeBtn.classList.remove("active");
});

// toggle delete-link mode
delLinkModeBtn.addEventListener("click", ()=>{
  delLinkMode = !delLinkMode;
  drawMode = false;
  linkFirst = null;
  delLinkModeBtn.style.opacity = delLinkMode ? "1" : "0.86";
  drawModeBtn.style.opacity = "0.86";
  delLinkModeBtn.classList.toggle("active", delLinkMode);
  drawModeBtn.classList.remove("active");
});

// when in draw or delete mode: click city selects first endpoint; second click creates/removes link
canvas.addEventListener("click", (e)=>{
  const {x,y} = toCanvas(e);
  // find city under click
  for(const name in cities){
    const p = cities[name];
    if(Math.hypot(p.x-x,p.y-y) <= radius){
      if(drawMode){
        if(!linkFirst){ linkFirst = name; highlightTemp(name); }
        else {
          if(linkFirst === name){ linkFirst=null; redraw(); return; }
          // create link if not exist
          if(!findLink(linkFirst,name)){
            const d = Math.round(distBetween(cities[linkFirst], cities[name]));
            links.push({a:linkFirst, b:name, dist:d});
          }
          linkFirst = null;
          redraw();
        }
      } else if(delLinkMode){
        if(!linkFirst){ linkFirst = name; highlightTemp(name); }
        else{
          if(linkFirst === name){ linkFirst=null; redraw(); return; }
          // remove link if exists
          const idx = links.findIndex(l=> (l.a===linkFirst&&l.b===name) || (l.a===name&&l.b===linkFirst));
          if(idx>=0) links.splice(idx,1);
          linkFirst = null;
          redraw();
        }
      }
      return;
    }
  }
  // not clicking on city: do nothing
});

// helper to draw temp highlight while selecting endpoints
function highlightTemp(name){
  drawGraph([]);
  // draw selected city highlight ring
  const p = cities[name];
  ctx.beginPath();
  ctx.arc(p.x,p.y, radius+6,0,Math.PI*2);
  ctx.strokeStyle = "#f1c40f";
  ctx.lineWidth = 4;
  ctx.stroke();
}

// ---------- dragging cities ----------
canvas.addEventListener("mousedown", (e)=>{
  const {x,y} = toCanvas(e);
  for(const name in cities){
    const p = cities[name];
    if(Math.hypot(p.x-x,p.y-y) <= radius){
      dragging = name; offsetX = x - p.x; offsetY = y - p.y;
      return;
    }
  }
});
canvas.addEventListener("mousemove", (e)=>{
  if(!dragging) return;
  const {x,y} = toCanvas(e);
  cities[dragging].x = Math.max(radius+6, Math.min(canvas.width-radius-6, x - offsetX));
  cities[dragging].y = Math.max(radius+6, Math.min(canvas.height-radius-6, y - offsetY));
  updateLinksAfterMove();
  redraw();
});
canvas.addEventListener("mouseup", ()=> { dragging = null; });
canvas.addEventListener("mouseleave", ()=> { dragging = null; });

// update link distances after moving cities
function updateLinksAfterMove(){
  for(const l of links){
    const A = cities[l.a], B = cities[l.b];
    l.dist = Math.round(distBetween(A,B));
  }
}

// ---------- algorithms ----------
// Dijkstra between start and end
function dijkstra(start, end){
  if(start===end) return [start];
  const nodes = Object.keys(cities);
  const dist = {}, prev = {};
  nodes.forEach(n => { dist[n] = Infinity; prev[n] = null; });
  dist[start] = 0;
  const Q = new Set(nodes);
  while(Q.size){
    // get node in Q with smallest dist
    let u = null;
    for(const n of Q) if(u===null || dist[n] < dist[u]) u = n;
    if(u===null || dist[u] === Infinity) break;
    Q.delete(u);
    if(u === end) break;
    // neighbors of u
    for(const l of links){
      let v = null;
      if(l.a === u) v = l.b;
      else if(l.b === u) v = l.a;
      if(v && Q.has(v)){
        const alt = dist[u] + l.dist;
        if(alt < dist[v]){
          dist[v] = alt; prev[v] = u;
        }
      }
    }
  }
  // reconstruct path
  const path = [];
  let cur = end;
  if(!prev[cur] && cur !== start && dist[cur] === Infinity) return []; // no path
  while(cur){
    path.unshift(cur);
    if(cur === start) break;
    cur = prev[cur];
    if(cur === null) break;
  }
  return path;
}

// Greedy heuristic (at each step pick neighbor with smallest edge weight not visited)
function greedyPath(start, end){
  if(start===end) return [start];
  const visited = new Set([start]);
  const path = [start];
  let cur = start;
  while(cur !== end){
    let candidates = [];
    for(const l of links){
      if(l.a === cur && !visited.has(l.b)) candidates.push({node:l.b,dist:l.dist});
      else if(l.b === cur && !visited.has(l.a)) candidates.push({node:l.a,dist:l.dist});
    }
    if(candidates.length === 0) break;
    candidates.sort((a,b)=>a.dist-b.dist);
    const next = candidates[0].node;
    path.push(next); visited.add(next); cur = next;
    // safety break
    if(path.length > Object.keys(cities).length+5) break;
  }
  return cur === end ? path : [];
}

// ---------- animation to draw path segment-by-segment ----------
function animatePath(path){
  if(animTimer) { clearInterval(animTimer); animTimer = null; }
  drawGraph([]); // base (no highlight)
  let segIndex = 0;
  const dot = {x:0,y:0};
  if(!path || path.length<2) return;
  function startSegment(i){
    if(i >= path.length-1){ // done, draw final highlighted path
      drawGraph(path);
      return;
    }
    const A = cities[path[i]], B = cities[path[i+1]];
    const steps = Math.max(20, Math.round(distBetween(A,B)/4));
    let step = 0;
    animTimer = setInterval(()=>{
      const t = step/steps;
      dot.x = A.x + (B.x-A.x)*t;
      dot.y = A.y + (B.y-A.y)*t;
      // redraw: background links, highlighted completed segments, moving dot
      drawGraph(path.slice(0,i+1)); // draw earlier segments highlighted
      // draw current segment partially highlighted
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(A.x,A.y);
      ctx.lineTo(dot.x,dot.y);
      ctx.stroke();
      // moving dot
      ctx.beginPath();
      ctx.arc(dot.x,dot.y,8,0,Math.PI*2);
      ctx.fillStyle = "#f39c12";
      ctx.fill();
      step++;
      if(step > steps){
        clearInterval(animTimer); animTimer = null;
        startSegment(i+1);
      }
    }, 18);
  }
  startSegment(0);
}

// ---------- UI run algorithm ----------
greedyBtn.addEventListener("click", ()=>{
  const from = fromSel.value, to = toSel.value;
  if(!from || !to){ alert("Chọn thành phố bắt đầu và kết thúc!"); return; }
  if(Object.keys(cities).length < 2){ alert("Cần ít nhất 2 thành phố"); return; }
  const path = greedyPath(from,to);
  if(!path || path.length===0){ resultEl.textContent = "Không tìm được đường (theo cạnh hiện có)"; return; }
  resultEl.textContent = `🚦 Thuật toán tham lam: ${path.join(" ➜ ")}`;
  animatePath(path);
});

optimalBtn.addEventListener("click", ()=>{
  const from = fromSel.value, to = toSel.value;
  if(!from || !to){ alert("Chọn thành phố bắt đầu và kết thúc!"); return; }
  if(Object.keys(cities).length < 2){ alert("Cần ít nhất 2 thành phố"); return; }
  const path = dijkstra(from,to);
  if(!path || path.length===0){ resultEl.textContent = "Không tìm được đường (theo cạnh hiện có)"; return; }
  resultEl.textContent = `💡 Thuật toán tối ưu (Dijkstra): ${path.join(" ➜ ")}`;
  animatePath(path);
});

// findBtn just runs the optimal by default (you can change)
findBtn.addEventListener("click", ()=>{
  const from = fromSel.value, to = toSel.value;
  if(!from || !to){ alert("Chọn thành phố bắt đầu và kết thúc!"); return; }
  const path = dijkstra(from,to);
  if(!path || path.length===0){ resultEl.textContent = "Không tìm được đường (theo cạnh hiện có)"; return; }
  resultEl.textContent = `Kết quả: ${path.join(" ➜ ")}`;
  animatePath(path);
});

// ---------- utilities ----------
function toCanvas(e){
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function redraw(){ updateSelects(); drawGraph(); }

// initial draw
redraw();
