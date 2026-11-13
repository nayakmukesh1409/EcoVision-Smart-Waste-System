
const form = document.getElementById("uploadForm");
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const message = document.getElementById("message");
const analyzeBtn = document.getElementById("analyzeBtn");
const resetBtn = document.getElementById("resetBtn");

const dashboard = document.getElementById("dashboard");
const totalElement = document.getElementById("total");
const differentElement = document.getElementById("different");
const peopleCountElement = document.getElementById("peopleCount");
const categoryCards = document.getElementById("categoryCards");
const detectionsTable = document.getElementById("detections");
const annotatedImage = document.getElementById("annotated");

let barChart = null;
let pieChart = null;

const categories = [
    "Glass",
    "Metal",
    "Organic Waste",
    "Paper and Cardboard",
    "Plastic"
];

const colors = [
    "#3498db",
    "#f39c12",
    "#27ae60",
    "#9b59b6",
    "#e74c3c"
];

// Image preview
imageInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) {
        preview.classList.add("hidden");
        return;
    }

    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");

    message.textContent = "";
});

// Analyze image
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const file = imageInput.files[0];

    if (!file) {
        message.textContent = "Please select an image first.";
        return;
    }

    const formData = new FormData();
    formData.append("image", file);

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";
    message.textContent = "AI is analyzing your image. Please wait...";

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Analysis failed.");
        }

        displayResults(data);

        message.textContent = "Analysis completed successfully!";
        message.style.color = "green";

    } catch (error) {
        console.error(error);
        message.textContent = "Error: " + error.message;
        message.style.color = "red";
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Analyze Waste";
    }
});

// Display all results
function displayResults(data) {

    dashboard.classList.remove("hidden");

    peopleCountElement.textContent = data.people_count ?? 0;
    totalElement.textContent = data.total ?? 0;

    const counts = data.counts || {};

    const normalizedCounts = {};

    categories.forEach(category => {
        normalizedCounts[category] = counts[category] || 0;
    });

    differentElement.textContent = categories.filter(
        category => normalizedCounts[category] > 0
    ).length;

    displayCategoryCards(normalizedCounts, data.percentages || {});
    displayCharts(normalizedCounts);
    displayDetectionTable(data.detections || []);

    if (data.annotated_image) {
        annotatedImage.src = data.annotated_image + "?t=" + Date.now();
    }

    dashboard.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Category cards
function displayCategoryCards(counts, percentages) {

    categoryCards.innerHTML = "";

    categories.forEach((category, index) => {

        const count = counts[category] || 0;
        const percentage = percentages[category] || 0;

        const card = document.createElement("article");
        card.className = "stat category-card";

        card.style.borderTop = "4px solid " + colors[index];

        card.innerHTML = `
            <small>${category}</small>
            <strong>${count}</strong>
            <p>${percentage}% of detected waste</p>
        `;

        categoryCards.appendChild(card);
    });
}

// Charts
function displayCharts(counts) {

    const values = categories.map(category => counts[category] || 0);

    if (barChart) {
        barChart.destroy();
    }

    if (pieChart) {
        pieChart.destroy();
    }

    barChart = new Chart(document.getElementById("barChart"), {
        type: "bar",
        data: {
            labels: categories,
            datasets: [{
                label: "Waste items",
                data: values,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });

    pieChart = new Chart(document.getElementById("pieChart"), {
        type: "pie",
        data: {
            labels: categories,
            datasets: [{
                data: values,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Detection table
function displayDetectionTable(detections) {

    detectionsTable.innerHTML = "";

    if (detections.length === 0) {
        detectionsTable.innerHTML = `
            <tr>
                <td colspan="3">No waste detected in this image.</td>
            </tr>
        `;
        return;
    }

    detections.forEach(detection => {

        const row = document.createElement("tr");

        // Support all backend naming formats
        const category =
            detection.category ||
            detection.class_name ||
            detection.label ||
            detection.class ||
            "Unknown";

        const confidence =
            detection.confidence_percent ??
            detection.confidence ??
            0;

        const box =
            detection.box ||
            detection.bbox ||
            [];

        row.innerHTML = `
            <td>${category}</td>
            <td>${Number(confidence).toFixed(2)}%</td>
            <td>${box.join(", ")}</td>
        `;

        detectionsTable.appendChild(row);
    });
}

// Reset
resetBtn.addEventListener("click", function () {

    form.reset();

    preview.src = "";
    preview.classList.add("hidden");

    dashboard.classList.add("hidden");

    message.textContent = "";

    totalElement.textContent = "0";
    differentElement.textContent = "0";

    categoryCards.innerHTML = "";
    detectionsTable.innerHTML = "";

    annotatedImage.src = "";

    if (barChart) {
        barChart.destroy();
        barChart = null;
    }

    if (pieChart) {
        pieChart.destroy();
        pieChart = null;
    }
});

