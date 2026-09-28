const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priority");
const dueDateInput = document.getElementById("dueDate");
const addTaskButton = document.getElementById("addTaskButton");
const taskList = document.getElementById("taskList");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function displayTasks() {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = "<p>No tasks available.</p>";
        return;
    }

    tasks.forEach((task, index) => {
        const taskItem = document.createElement("div");
        taskItem.className = "task-item";

        taskItem.innerHTML = `
            <div>
                <h3>${task.name}</h3>
                <p>Priority: ${task.priority}</p>
                <p>Due Date: ${task.dueDate || "Not specified"}</p>
                <p>Status: ${task.completed ? "Completed" : "Pending"}</p>
            </div>

            <div>
                <button onclick="toggleTask(${index})">
                    ${task.completed ? "Undo" : "Complete"}
                </button>

                <button onclick="deleteTask(${index})">
                    Delete
                </button>
            </div>
        `;

        taskList.appendChild(taskItem);
    });
}

function addTask() {
    const taskName = taskInput.value.trim();

    if (taskName === "") {
        alert("Please enter a task.");
        return;
    }

    const task = {
        name: taskName,
        priority: priorityInput.value,
        dueDate: dueDateInput.value,
        completed: false
    };

    tasks.push(task);

    saveTasks();
    displayTasks();

    taskInput.value = "";
    priorityInput.value = "Medium";
    dueDateInput.value = "";
}

function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;

    saveTasks();
    displayTasks();
}

function deleteTask(index) {
    tasks.splice(index, 1);

    saveTasks();
    displayTasks();
}

addTaskButton.addEventListener("click", addTask);

displayTasks();
