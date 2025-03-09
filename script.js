document.addEventListener("DOMContentLoaded", () => {
    const taskNameInput = document.getElementById("taskName");
    const taskDateInput = document.getElementById("taskDate");
    const taskTimeInput = document.getElementById("taskTime");
    const taskHoursInput = document.getElementById("taskHours");
    const addTaskButton = document.getElementById("addTask");
    const taskList = document.getElementById("taskList");
    const ctx = document.getElementById("taskChart").getContext("2d");
    const overclockedPopup = document.getElementById("overclockedPopup");

    let tasks = [];
    let taskChart;
    let taskData = {
        labels: [],
        datasets: []
    };

    // Update the chart with current data
    function updateChart() {
        if (taskChart) {
            taskChart.destroy();
        }
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

    // Generate a unique color based on index
    function generateColor(index) {
        return `hsl(${(index * 137) % 360}, 70%, 60%)`;
    }

    // Render the task list with delete buttons
    function renderTaskList() {
        taskList.innerHTML = "";
        tasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.innerHTML = `${task.name} (${task.date}) - ${task.hours} hrs 
                <button class="delete-btn" data-index="${index}">❌</button>`;
            li.querySelector(".delete-btn").addEventListener("click", () => removeTask(index));
            taskList.appendChild(li);
        });
    }

    // Remove a task and update chart and list
    function removeTask(index) {
        tasks.splice(index, 1);
        taskData.datasets.splice(index, 1);
        updateChart();
        renderTaskList();
    }

    // Distribute task hours evenly from now until the due date
    function distributeTaskHours(task) {
        const { name, date, hours } = task;
        const now = new Date();
        const dueDate = new Date(date);
        let daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft < 1) daysLeft = 1;
        const dailyHours = hours / daysLeft;
        const color = generateColor(taskData.datasets.length);

        let taskDataset = {
            label: name,
            data: new Array(daysLeft).fill(dailyHours),
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1
        };

        taskData.datasets.push(taskDataset);

        // Determine the overall date range from today to the latest due date
        let latestDue = new Date(Math.max(...tasks.map(t => new Date(t.date))));
        let totalDays = Math.ceil((latestDue - now) / (1000 * 60 * 60 * 24)) + 1;
        taskData.labels = [...Array(totalDays).keys()].map(i => {
            let day = new Date(now);
            day.setDate(now.getDate() + i);
            return day.toISOString().split("T")[0];
        });
    }

    // Show the overclocked pop-up for 3 seconds
    function showOverclockedPopup() {
        overclockedPopup.classList.remove("hidden");
        setTimeout(() => {
            overclockedPopup.classList.add("hidden");
        }, 3000);
    }

    addTaskButton.addEventListener("click", (event) => {
        event.preventDefault();

        const taskName = taskNameInput.value.trim();
        const taskDate = taskDateInput.value;
        let taskTime = taskTimeInput.value;
        const estimatedHours = parseFloat(taskHoursInput.value);

        if (!taskName || !taskDate || isNaN(estimatedHours) || estimatedHours <= 0) {
            alert("Please enter a valid task name, date, and estimated hours.");
            return;
        }

        if (!taskTime) {
            taskTime = "23:59";
        }

        const deadline = new Date(`${taskDate}T${taskTime}`);
        if (isNaN(deadline.getTime())) {
            alert("Invalid date/time format!");
            return;
        }

        const now = new Date();
        const availableHours = (deadline - now) / (1000 * 60 * 60);

        if (deadline <= now) {
            alert("Due date must be in the future!");
            return;
        }

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

    overclockedPopup.classList.add("hidden");
    updateChart();
});
