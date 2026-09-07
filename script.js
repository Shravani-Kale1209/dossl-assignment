const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");

const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");

let tasks = [];

function updateTaskCount() {
    totalTasks.textContent = tasks.length;

    const completed = tasks.filter(task => task.completed).length;
    completedTasks.textContent = completed;
}

function displayTasks() {
    taskList.innerHTML = "";

    tasks.forEach((task, index) => {

        const li = document.createElement("li");
        li.className = "task";

        li.innerHTML = `
            <input type="checkbox" ${task.completed ? "checked" : ""}>
            <span class="task-text ${task.completed ? "completed" : ""}">
                ${task.text}
            </span>
            <button class="delete-btn">Delete</button>
        `;

        const checkbox = li.querySelector("input");

        checkbox.addEventListener("change", function () {
            tasks[index].completed = checkbox.checked;
            displayTasks();
        });

        const deleteBtn = li.querySelector(".delete-btn");

        deleteBtn.addEventListener("click", function () {
            tasks.splice(index, 1);
            displayTasks();
        });

        taskList.appendChild(li);
    });

    updateTaskCount();
}

function addTask() {

    const taskText = taskInput.value.trim();

    if (taskText === "") {
        alert("Please enter a task.");
        return;
    }

    tasks.push({
        text: taskText,
        completed: false
    });

    taskInput.value = "";

    displayTasks();
}

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        addTask();
    }
});

displayTasks();