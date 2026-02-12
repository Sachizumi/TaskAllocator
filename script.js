const supabaseClient = supabase.createClient(
  "https://ordpteeyjqppcmhrpodc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZHB0ZWV5anFwcGNtaHJwb2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTcwNjUsImV4cCI6MjA4NjQzMzA2NX0.cwwWZk87oLMFQnG6KYla-J8M7Nckw86922YwbUzMb1I"
);

document.addEventListener("DOMContentLoaded", () => {
  const authSection = document.querySelector(".auth");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const app = document.getElementById("app");

  const taskNameInput = document.getElementById("taskName");
  const taskDateInput = document.getElementById("taskDate");
  const taskTimeInput = document.getElementById("taskTime");
  const taskHoursInput = document.getElementById("taskHours");
  const taskPriorityInput = document.getElementById("taskPriority");
  const addTaskButton = document.getElementById("addTask");
  const taskList = document.getElementById("taskList");
  const ctx = document.getElementById("taskChart").getContext("2d");
  const overclockedPopup = document.getElementById("overclockedPopup");
  const themeToggle = document.getElementById("themeToggle");

setInterval(() => {
  updateTodayCapacity();
}, 60000);

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
  });

  let currentUser = null;
  let tasks = [];
  let taskChart;
  let taskData = { labels: [], datasets: [] };

function updateTodayCapacity() {
  const textDisplay = document.getElementById("todayCapacity");
  const fill = document.getElementById("capacityFill");

  if (!textDisplay || !fill) return;

  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const remainingToday = (endOfDay - now) / 36e5;
  let todayAllocated = 0;

  taskData.datasets.forEach(dataset => {
    if (dataset.data && dataset.data.length > 0) {
      todayAllocated += dataset.data[0];
    }
  });

  const freeHours = remainingToday - todayAllocated;

  const percentUsed = (todayAllocated / remainingToday) * 100;
  const usedClamped = Math.min(percentUsed, 100);
  fill.style.width = `${usedClamped}%`;

  fill.classList.remove("capacity-safe", "capacity-warning", "capacity-danger");

  if (percentUsed < 60) {
    fill.classList.add("capacity-safe");
  } else if (percentUsed < 90) {
    fill.classList.add("capacity-warning");
  } else {
    fill.classList.add("capacity-danger");
  }

  // Format function
  function formatTime(decimalHours) {
    const hours = Math.floor(Math.abs(decimalHours));
    const minutes = Math.floor((Math.abs(decimalHours) % 1) * 60);
    return `${hours}h ${minutes}m`;
  }

  if (freeHours >= 0) {
    textDisplay.textContent =
      `Used: ${formatTime(todayAllocated)} • Remaining: ${formatTime(freeHours)}`;
  } else {
    textDisplay.textContent =
      `Overbooked by ${formatTime(freeHours)}`;
  }
}

  function showApp() {
    app.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    authSection.classList.add("hidden");
  }

  function hideApp() {
    app.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    authSection.classList.remove("hidden");
  }

  loginBtn.addEventListener("click", async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: usernameInput.value,
      password: passwordInput.value
    });

    if (error) return alert(error.message);

    currentUser = data.user;
    showApp();
    await loadTasks();
  });

  registerBtn.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signUp({
      email: usernameInput.value,
      password: passwordInput.value
    });

    if (error) return alert(error.message);
    alert("Check your email to verify your account.");
  });

  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    tasks = [];
    resetChart();
    renderTaskList();
    hideApp();
  });

  supabaseClient.auth.onAuthStateChange((_e, session) => {
    if (session) {
      currentUser = session.user;
      showApp();
      loadTasks();
    } else {
      hideApp();
    }
  });

  async function loadTasks() {
    const { data, error } = await supabaseClient
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return console.error(error);

    tasks = data.map(t => ({
      id: t.id,
      name: t.name,
      deadline: new Date(t.deadline),
      hours: t.hours,
      priority: t.priority || "medium"
    }));

    rebuildChart();
    renderTaskList();
  }

  async function saveTask(task) {
    const { error } = await supabaseClient.from("tasks").insert({
      user_id: currentUser.id,
      name: task.name,
      deadline: task.deadline.toISOString(),
      hours: task.hours,
      priority: task.priority
    });

    if (error) alert(error.message);
  }

  async function deleteTask(taskId) {
    const { error } = await supabaseClient
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) alert(error.message);
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case "high":
        return "#dc3545";
      case "medium":
        return "#fd7e14";
      case "low":
        return "#198754";
      default:
        return "#6c757d";
    }
  }

  function updateChart() {
    if (taskChart) taskChart.destroy();

    const today = new Date().toISOString().split("T")[0];

    taskChart = new Chart(ctx, {
      type: "bar",
      data: taskData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            ticks: {
              color: c =>
                taskData.labels[c.index] === today ? "#dc3545" : "#666",
              font: c =>
                taskData.labels[c.index] === today ? { weight: "bold" } : {}
            }
          },
          y: { stacked: true, beginAtZero: true }
        }
      }
    });

    updateTodayCapacity();
  }

  function resetChart() {
    taskData = { labels: [], datasets: [] };
    updateChart();
  }

  function rebuildChart() {
    taskData = { labels: [], datasets: [] };

    const priorityOrder = { high: 1, medium: 2, low: 3 };

    tasks
      .slice()
      .sort((a, b) =>
        priorityOrder[a.priority] !== priorityOrder[b.priority]
          ? priorityOrder[a.priority] - priorityOrder[b.priority]
          : a.deadline - b.deadline
      )
      .forEach(distributeTaskHours);

    updateChart();
  }

  function distributeTaskHours(task) {
    const now = new Date();
    const days = Math.max(
      1,
      Math.ceil((task.deadline - now) / (1000 * 60 * 60 * 24))
    );

    const daily = task.hours / days;
    const color = getPriorityColor(task.priority);

    taskData.datasets.push({
      label: `${task.name} (${task.priority})`,
      data: Array(days).fill(daily),
      backgroundColor: color
    });

    taskData.labels = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }

  function renderTaskList() {
    taskList.innerHTML = "";

    tasks.forEach((task, i) => {
      const li = document.createElement("li");
      li.classList.add("task-row");

      const badgeClass =
        task.priority === "high"
          ? "priority-high"
          : task.priority === "medium"
          ? "priority-medium"
          : "priority-low";

      li.innerHTML = `
        <div class="task-left">
          <span class="task-name">${task.name}</span>
          <div class="badge-slot">
            <span class="priority-badge ${badgeClass}">
              ${task.priority.toUpperCase()}
            </span>
          </div>
        </div>

        <div class="task-center">
          (${task.deadline.toISOString().split("T")[0]}) – ${task.hours} hrs
        </div>

        <div class="task-right">
          <button class="delete-btn">❌</button>
        </div>
      `;

      li.querySelector("button").onclick = async () => {
        await deleteTask(task.id);
        tasks.splice(i, 1);
        rebuildChart();
        renderTaskList();
      };

      taskList.appendChild(li);
    });
  }

  addTaskButton.addEventListener("click", async e => {
    e.preventDefault();
    if (!currentUser) return alert("Login required.");

    const name = taskNameInput.value.trim();
    const date = taskDateInput.value;
    const time = taskTimeInput.value || "23:59";
    const hours = parseFloat(taskHoursInput.value);
    const priority = taskPriorityInput.value;

    if (!name || !date || hours <= 0) return alert("Invalid task.");

    const deadline = new Date(`${date}T${time}`);
    const available = (deadline - new Date()) / 36e5;

    if (hours > available) {
      overclockedPopup.classList.remove("hidden");
      setTimeout(() => overclockedPopup.classList.add("hidden"), 3000);
      return;
    }

    await saveTask({ name, deadline, hours, priority });
    await loadTasks();

    taskNameInput.value = "";
    taskDateInput.value = "";
    taskTimeInput.value = "";
    taskHoursInput.value = "";
    taskPriorityInput.value = "medium";
  });
});
