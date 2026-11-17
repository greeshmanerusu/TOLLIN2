const STORAGE_KEY = "manuflow_data_v1";

const defaults = {
  production: [
    {id:"P001", product:"Steel Components", target:500, completed:380, status:"In Progress"},
    {id:"P002", product:"Metal Sheets", target:300, completed:300, status:"Completed"}
  ],
  inventory: [
    {id:"I001", name:"Steel Rods", category:"Raw Material", quantity:100, price:250},
    {id:"I002", name:"Metal Sheets", category:"Raw Material", quantity:12, price:500},
    {id:"I003", name:"Finished Components", category:"Finished Goods", quantity:250, price:850}
  ],
  orders: [
    {id:"O001", customer:"ABC Industries", product:"Steel Components", amount:25000, status:"Processing"},
    {id:"O002", customer:"XYZ Traders", product:"Metal Sheets", amount:18000, status:"Delivered"}
  ],
  machinery: [
    {id:"M001", name:"Cutting Machine", department:"Production", service:"2026-10-20", status:"Operational"},
    {id:"M002", name:"Welding Machine", department:"Assembly", service:"2026-10-15", status:"Maintenance"}
  ],
  employees: [
    {id:"E001", name:"Employee One", department:"Production", shift:"Morning", status:"Active"},
    {id:"E002", name:"Employee Two", department:"Quality", shift:"Evening", status:"Active"}
  ],
  payments: [
    {id:"PAY001", customer:"ABC Industries", amount:25000, date:"2026-11-01", status:"Paid"},
    {id:"PAY002", customer:"XYZ Traders", amount:18000, date:"2026-11-02", status:"Pending"}
  ],
  wastage: [
    {id:"W001", product:"Steel Components", quantity:5, reason:"Production defect", date:"2026-11-03"}
  ],
  alerts: [
    {id:"A001", message:"Steel sheet inventory is running low", level:"Warning"},
    {id:"A002", message:"Welding machine requires maintenance", level:"Warning"}
  ]
};

let data;

try {
  data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaults);
} catch {
  data = structuredClone(defaults);
}

const fields = {
  production: [
    ["product","Product name"],["target","Target quantity"],["completed","Completed quantity"],["status","Status"]
  ],
  inventory: [
    ["name","Item name"],["category","Category"],["quantity","Stock quantity"],["price","Unit price"]
  ],
  orders: [
    ["customer","Customer name"],["product","Product"],["amount","Order amount"],["status","Order status"]
  ],
  machinery: [
    ["name","Machine name"],["department","Department"],["service","Last service date"],["status","Machine status"]
  ],
  employees: [
    ["name","Employee name"],["department","Department"],["shift","Shift"],["status","Employee status"]
  ],
  payments: [
    ["customer","Customer name"],["amount","Payment amount"],["date","Payment date"],["status","Payment status"]
  ],
  wastage: [
    ["product","Product"],["quantity","Damaged quantity"],["reason","Reason"],["date","Report date"]
  ],
  alerts: [
    ["message","Alert message"],["level","Alert level"]
  ]
};

const headings = {
  production:["Task ID","Product","Target","Completed","Status"],
  inventory:["Item ID","Item Name","Category","Quantity","Unit Price"],
  orders:["Order ID","Customer","Product","Amount (₹)","Status"],
  machinery:["Machine ID","Machine Name","Department","Last Service","Status"],
  employees:["Employee ID","Name","Department","Shift","Status"],
  payments:["Payment ID","Customer","Amount (₹)","Date","Status"],
  wastage:["Report ID","Product","Quantity","Reason","Date"],
  alerts:["Alert ID","Message","Level"]
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);
}

function nextId(section) {
  const prefix = {
    production:"P", inventory:"I", orders:"O", machinery:"M",
    employees:"E", payments:"PAY", wastage:"W", alerts:"A"
  }[section];

  return prefix + String(Date.now()).slice(-7);
}

function displayStatus(value) {
  const safe = escapeHTML(value);
  return `<span class="tag">${safe}</span>`;
}

function renderTable(section, elementId) {
  const body = document.getElementById(elementId);
  if (!body) return;

  const records = data[section];
  const keys = Object.keys(records[0] || {id:"", value:""});
  const visibleKeys = keys.filter(k => k !== "id");

  const header = headings[section] || [];
  const table = body.closest("table");

  if (table) {
    const thead = table.querySelector("thead");
    if (thead) {
      thead.innerHTML = `<tr>${header.map(h=>`<th>${h}</th>`).join("")}<th>Actions</th></tr>`;
    }
  }

  body.innerHTML = records.map((record,index) => `
    <tr>
      <td>${escapeHTML(record.id)}</td>
      ${visibleKeys.map(key => `
        <td>${key === "status" || key === "level"
          ? displayStatus(record[key])
          : escapeHTML(record[key])}</td>
      `).join("")}
      <td class="actions">
        <button class="edit-btn" data-action="edit" data-section="${section}" data-index="${index}">Edit</button>
        <button class="delete-btn" data-action="delete" data-section="${section}" data-index="${index}">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="8">No records available.</td></tr>`;
}

function updateOverview() {
  const set = (id,value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("totalProduction",
    data.production.reduce((sum,r)=>sum+Number(r.completed || 0),0).toLocaleString()
  );

  set("activeOrders",
    data.orders.filter(r=>r.status.toLowerCase()!=="delivered").length
  );

  set("inventoryCount",
    data.inventory.reduce((sum,r)=>sum+Number(r.quantity || 0),0).toLocaleString()
  );

  set("pendingAlerts",data.alerts.length);

  const date = document.getElementById("todayDate");
  if(date) date.textContent = new Date().toLocaleDateString("en-IN",{
    day:"numeric",month:"long",year:"numeric"
  });

  const recent = document.getElementById("recentOrders");
  if(recent) {
    recent.innerHTML = data.orders.slice(-5).reverse().map(r=>`
      <tr>
        <td>${escapeHTML(r.id)}</td>
        <td>${escapeHTML(r.product)}</td>
        <td>—</td>
        <td>Normal</td>
        <td>${displayStatus(r.status)}</td>
      </tr>
    `).join("");
  }

  const chart = document.getElementById("productionChart");
  if(chart) {
    const total = data.production.reduce((s,r)=>s+Number(r.completed||0),0);
    const target = data.production.reduce((s,r)=>s+Number(r.target||0),0);
    const percent = target ? Math.min(100,Math.round(total/target*100)) : 0;
    chart.innerHTML = `
      <p>Total completed: <strong>${total}</strong> units</p>
      <div class="bar"><div style="width:${percent}%"></div></div>
      <p>${percent}% of combined production target</p>
    `;
  }

  const machineCounts = {
    Operational:0, Maintenance:0, Offline:0
  };
  data.machinery.forEach(m=>{
    if(machineCounts[m.status] !== undefined) machineCounts[m.status]++;
  });

  const summary = document.querySelector(".machine-summary");
  if(summary) {
    summary.innerHTML = `
      <div>🟢 Operational <strong>${machineCounts.Operational}</strong></div>
      <div>🟠 Maintenance <strong>${machineCounts.Maintenance}</strong></div>
      <div>🔴 Offline <strong>${machineCounts.Offline}</strong></div>
    `;
  }

  const alertList = document.getElementById("alertsList");
  if(alertList) {
    alertList.innerHTML = data.alerts.map(a=>`
      <div class="alert-item">
        <strong>${escapeHTML(a.level)}</strong>
        <p>${escapeHTML(a.message)}</p>
        <button class="delete-btn" data-action="delete" data-section="alerts" data-index="${data.alerts.indexOf(a)}">Dismiss</button>
      </div>
    `).join("") || "<p>No pending alerts.</p>";
  }
}

function renderAll() {
  renderTable("production","productionTable");
  renderTable("inventory","inventoryTable");
  renderTable("orders","ordersTable");
  renderTable("machinery","machineryTable");
  renderTable("employees","employeesTable");
  renderTable("payments","paymentsTable");
  renderTable("wastage","wastageTable");
  updateOverview();
}

function addRecord(section) {
  const record = {id:nextId(section)};

  for(const [key,label] of fields[section]) {
    const value = prompt("Enter " + label + ":");
    if(value === null) return;
    if(!value.trim()) {
      alert(label + " cannot be empty.");
      return;
    }
    record[key] = ["quantity","price","amount","target","completed"].includes(key)
      ? Number(value) : value.trim();

    if(["quantity","price","amount","target","completed"].includes(key) &&
       (!Number.isFinite(record[key]) || record[key] < 0)) {
      alert("Please enter a valid non-negative number.");
      return;
    }
  }

  data[section].push(record);
  save();
  alert("Record added successfully!");
}

function editRecord(section,index) {
  const record = data[section][index];
  if(!record) return;

  const updated = {...record};

  for(const [key,label] of fields[section]) {
    const value = prompt("Edit " + label + ":",record[key]);
    if(value === null) return;
    if(!value.trim()) {
      alert(label + " cannot be empty.");
      return;
    }

    updated[key] = ["quantity","price","amount","target","completed"].includes(key)
      ? Number(value) : value.trim();

    if(["quantity","price","amount","target","completed"].includes(key) &&
       (!Number.isFinite(updated[key]) || updated[key] < 0)) {
      alert("Please enter a valid non-negative number.");
      return;
    }
  }

  data[section][index] = updated;
  save();
  alert("Record updated successfully!");
}

document.addEventListener("click",event=>{
  const nav = event.target.closest(".nav-btn");
  if(nav) {
    const section = nav.dataset.section;
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    document.getElementById(section)?.classList.add("active");

    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    nav.classList.add("active");

    const title = nav.textContent.trim().replace(/^[^\w₹]+/,"");
    document.getElementById("pageTitle").textContent = title;
    document.getElementById("currentPage").textContent = title.toUpperCase();
  }

  const go = event.target.closest("[data-go]");
  if(go) document.querySelector(`[data-section="${go.dataset.go}"]`)?.click();

  const action = event.target.closest("[data-action]");
  if(action) {
    const {section,index} = action.dataset;
    const i = Number(index);

    if(action.dataset.action === "edit") editRecord(section,i);

    if(action.dataset.action === "delete" &&
       confirm("Are you sure you want to delete this record?")) {
      data[section].splice(i,1);
      save();
    }
  }
});

const addButtons = {
  addProduction:"production",
  addInventory:"inventory",
  addOrder:"orders",
  addMachine:"machinery",
  addEmployee:"employees",
  addPayment:"payments",
  addWastage:"wastage"
};

Object.entries(addButtons).forEach(([buttonId,section])=>{
  document.getElementById(buttonId)?.addEventListener("click",()=>addRecord(section));
});

document.getElementById("inventorySearch")?.addEventListener("input",event=>{
  const term = event.target.value.toLowerCase();
  document.querySelectorAll("#inventoryTable tr").forEach(row=>{
    row.style.display = row.textContent.toLowerCase().includes(term) ? "" : "none";
  });
});

renderAll();
