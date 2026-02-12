const supabaseClient = supabase.createClient(
  "https://ordpteeyjqppcmhrpodc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZHB0ZWV5anFwcGNtaHJwb2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTcwNjUsImV4cCI6MjA4NjQzMzA2NX0.cwwWZk87oLMFQnG6KYla-J8M7Nckw86922YwbUzMb1I"
);

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- AUTH ELEMENTS ---------- */
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const app = document.getElementById("app");

  /* ---------- TASK ELEMENTS ---------- */
  const taskNameInput = document.getElementById("taskName");
  const taskDateInput = document.getElementById("taskDate");
  const taskTimeInput = document.getElementById("taskTime");
  const taskHoursInput = document.getElementById("taskHours");
  const addTaskButton = document.getElementById("addTask");
  const taskList = document.getElementById("taskList");
  const ctx = document.getElementById("taskChart").getContext("2d");
  const overclockedPopup = document.getElementById("overclockedPopup");

  let currentUser = null;
  let tasks = [];
  let taskChart;
  let taskData = { labels: [], datasets: [] };

  /* ---------- AUTH UI ---------- */
  function showApp() {
    app.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
  }

  function hideApp() {
    app.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }

  /* ---------- AUTH ACTIONS ---------- */
  loginBtn.addEventListener("click", async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: usernameInput.value,
      password: passwordInput.value
    });

    if (error) return alert(error.message);

    currentUser = data.user;
    showApp();
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
    taskData = { labels: [], datasets: [] };
    updateChart();
    renderTaskList();
    hideApp();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
      currentUser = session.user;
      showApp();
    } else {
      hideApp();
    }
  });

  /* ---------- CHART LOGIC ---------- */
  function updateChart() {
    if (taskChart) taskChart.destroy();
    taskChart = new Chart(ctx, {
      type: "bar",
      data: taskData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    });
  }

  function generateColor(index) {
    return `hsl(${(index * 137) % 360}, 70%, 60%)`;
  }

  function renderTaskList() {
    taskList.innerHTML = "";
    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.innerHTML = `${task.name} (${task.date}) - ${task.hours} hrs 
        <button class="delete-btn">❌</button>`;
      li.querySelector(".delete-btn")
        .addEventListener("click", () => removeTask(index));
      taskList.appendChild(li);
    });
  }

  function removeTask(index) {
    tasks.splice(index, 1);
    taskData.datasets.splice(index, 1);
    updateChart();
    renderTaskList();
  }

  function distributeTaskHours(task) {
    const now = new Date();
    const dueDate = new Date(task.date);
    let daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 1) daysLeft = 1;

    const dailyHours = task.hours / daysLeft;
    const color = generateColor(taskData.datasets.length);

    taskData.datasets.push({
      label: task.name,
      data: new Array(daysLeft).fill(dailyHours),
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1
    });

    let latestDue = new Date(Math.max(...tasks.map(t => new Date(t.date))));
    let totalDays = Math.ceil((latestDue - now) / (1000 * 60 * 60 * 24)) + 1;

    taskData.labels = [...Array(totalDays).keys()].map(i => {
      let day = new Date(now);
      day.setDate(now.getDate() + i);
      return day.toISOString().split("T")[0];
    });
  }

  function showOverclockedPopup() {
    overclockedPopup.classList.remove("hidden");
    setTimeout(() => {
      overclockedPopup.classList.add("hidden");
    }, 3000);
  }

  /* ---------- ADD TASK ---------- */
  addTaskButton.addEventListener("click", (event) => {
    event.preventDefault();

    if (!currentUser) return alert("Login required.");

    const taskName = taskNameInput.value.trim();
    const taskDate = taskDateInput.value;
    let taskTime = taskTimeInput.value;
    const estimatedHours = parseFloat(taskHoursInput.value);

    if (!taskName || !taskDate || isNaN(estimatedHours) || estimatedHours <= 0) {
      return alert("Please enter valid task details.");
    }

    if (!taskTime) taskTime = "23:59";

    const deadline = new Date(`${taskDate}T${taskTime}`);
    const now = new Date();

    if (deadline <= now) return alert("Due date must be in the future.");

    const availableHours = (deadline - now) / (1000 * 60 * 60);
    if (estimatedHours > availableHours) {
      showOverclockedPopup();
      return;
    }

    const newTask = { name: taskName, date: taskDate, hours: estimatedHours };
    tasks.push(newTask);

    distributeTaskHours(newTask);
    updateChart();
    renderTaskList();

    taskNameInput.value = "";
    taskDateInput.value = "";
    taskTimeInput.value = "";
    taskHoursInput.value = "";
  });

  updateChart();
});
