// Dữ liệu đồ thị (theo hình ảnh)
const graph = {
  "Start": { A: 15, B: 10, C: 25 },
  "A": { D: 11 },
  "B": { D: 20, E: 2 },
  "C": { F: 13 },
  "D": { G: 27 },
  "E": { G: 7, F: 19 },
  "F": {},
  "G": {}
};

const positions = {
  "Start": [100, 250],
  "A": [250, 120],
  "B": [250, 250],
  "C": [250, 380],
  "D": [400, 120],
  "E": [400, 320],
  "F": [400, 400],
  "G": [650, 220]
};

// Vẽ đồ thị lên canvas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function drawGraph(path = []) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Vẽ cạnh
  ctx.lineWidth = 2;
  ctx.font = "14px Arial";
  ctx.fillStyle = "#2c3e50";

  for (let node in graph) {
    for (let neighbor in graph[node]) {
      const [x1, y1] = positions[node];
      const [x2, y2] = positions[neighbor];
      ctx.strokeStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      ctx.fillText(graph[node][neighbor], midX, midY - 5);
    }
  }

  // Vẽ đường đi ngắn nhất
  if (path.length > 1) {
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = positions[path[i]];
      const [x2, y2] = positions[path[i + 1]];
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  // Vẽ các nút
  for (let node in positions) {
    const [x, y] = positions[node];
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, 2 * Math.PI);
    ctx.fillStyle = path.includes(node) ? "#e74c3c" : "#3498db";
    ctx.fill();
    ctx.strokeStyle = "#2c3e50";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(node, x - 12, y + 5);
  }
}

// Giải thuật tham lam (Greedy)
function greedy(start, end) {
  let current = start;
  let visited = new Set();
  let totalCost = 0;
  let path = [current];

  while (current !== end) {
    visited.add(current);
    let neighbors = graph[current];
    let nextNode = null;
    let minCost = Infinity;

    for (let neighbor in neighbors) {
      if (!visited.has(neighbor) && neighbors[neighbor] < minCost) {
        minCost = neighbors[neighbor];
        nextNode = neighbor;
      }
    }

    if (nextNode === null) break;
    totalCost += minCost;
    current = nextNode;
    path.push(current);
  }

  return { path, totalCost };
}

// Giải thuật Dijkstra (tối ưu)
function dijkstra(start, end) {
  let distances = {};
  let prev = {};
  let pq = [];

  for (let node in graph) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[start] = 0;
  pq.push({ node: start, cost: 0 });

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { node } = pq.shift();

    for (let neighbor in graph[node]) {
      const newDist = distances[node] + graph[node][neighbor];
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        prev[neighbor] = node;
        pq.push({ node: neighbor, cost: newDist });
      }
    }
  }

  // Dựng lại đường đi
  let path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);
    curr = prev[curr];
  }

  return { path, totalCost: distances[end] };
}

// Gắn sự kiện nút
document.getElementById("greedyBtn").onclick = () => {
  const { path, totalCost } = greedy("Start", "G");
  drawGraph(path);
  document.getElementById("output").innerHTML =
    `🚀 Giải pháp tham lam: ${path.join(" ➜ ")} (Tổng chi phí: ${totalCost})`;
};

document.getElementById("optimalBtn").onclick = () => {
  const { path, totalCost } = dijkstra("Start", "G");
  drawGraph(path);
  document.getElementById("output").innerHTML =
    `💡 Giải pháp tối ưu (Dijkstra): ${path.join(" ➜ ")} (Tổng chi phí: ${totalCost})`;
};

document.getElementById("resetBtn").onclick = () => {
  drawGraph();
  document.getElementById("output").innerHTML = "";
};

// Vẽ ban đầu
drawGraph();
