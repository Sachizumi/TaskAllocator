const supabaseClient = supabase.createClient(
  "https://ordpteeyjqppcmhrpodc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZHB0ZWV5anFwcGNtaHJwb2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTcwNjUsImV4cCI6MjA4NjQzMzA2NX0.cwwWZk87oLMFQnG6KYla-J8M7Nckw86922YwbUzMb1I"
);

document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const app = document.getElementById("app");
  const addTaskButton = document.getElementById("addTask");
  const taskList = document.getElementById("taskList");
  const ctx = document.getElementById("taskChart").getContext("2d");
  const overclockedPopup = document.getElementById("overclockedPopup");

  let currentUser = null;
  let tasks = [];
  let taskChart;
  let taskData = { labels: [], datasets: [] };

  /* ---------- AUTH UI HELPERS ---------- */
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
    alert("Registered! You can now log in.");
  });

  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    tasks = [];
    taskData.datasets = [];
    updateChart();
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

  /* ---------- CHART LOGIC (UNCHANGED, SAFE) ---------- */
  function updateChart() {
    if (taskChart) taskChart.destroy();
    taskChart = new Chart(ctx, {
      type: "bar",
      data: taskData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } }
      }
    });
  }

  addTaskButton.addEventListener("click", () => {
    if (!currentUser) return alert("Login required");
    alert("Task logic stays the same here 👍");
  });

  updateChart();
});
