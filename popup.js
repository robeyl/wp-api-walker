document.addEventListener("DOMContentLoaded", function () {
  getBaseUrl(function (baseUrl) {
    fetchTypes(baseUrl);
  });
});

// Function to show the loader
function showLoader() {
  document.getElementById("loader").style.display = "block";
}

// Function to hide the loader
function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

let currentItems = []; // Holds the current list of items to be searched

function handleSearchInput() {
  const searchTerm = this.value.toLowerCase(); // 'this' refers to the searchInput element
  const resultsContainer = document.getElementById("results");

  // Clear existing items and re-add the heading
  resultsContainer.innerHTML = `<h3>${currentTypeName}</h3>`; // Assumes currentTypeName is globally accessible

  const filteredItems = currentItems.filter((item) =>
    item.title.rendered.toLowerCase().includes(searchTerm),
  );
  filteredItems.forEach((item) => displayItem(item, resultsContainer));
}

// Modified checkTypeStatus function that checks the accessibility of items
// and conditionally sets up a click handler.
function checkTypeStatus(endpoint, statusElement, itemElement, type) {
  fetch(endpoint)
    .then((response) => {
      if (response.ok) {
        return response.json().then((data) => {
          if (data.length === 0) {
            throw new Error("No content");
          }
          return data; // Data is valid and not empty
        });
      } else {
        throw new Error("Invalid response");
      }
    })
    .then((data) => {
      // Accessible content
      statusElement.classList.add("accessible");
      statusElement.textContent = "✓";

      // Attach click event handler that is specific to accessible items
      itemElement.addEventListener("click", () => {
        // Logic to handle click for accessible items, such as fetching and displaying items of the selected type
        // For example:
        fetchItems(type._links["wp:items"][0].href, type.name);
      });
    })
    .catch((error) => {
      // Inaccessible content or error
      statusElement.classList.add("inaccessible");
      statusElement.textContent = "✗";

      // Here, we do not attach any click event handler, effectively disabling interaction
      // No additional action is needed to "disable" the item since no click handler will be attached
    });
}

// Fetch the types from the WordPress REST API
function fetchTypes(baseURL) {
  showLoader(); // Show the loader
  const endpoint = `${baseURL}/wp-json/wp/v2/types`;
  fetch(endpoint)
    .then((response) => response.json())
    .then((data) => {
      hideLoader(); // Hide the loader
      displayTypes(data);
    })
    .catch((error) => {
      hideLoader(); // Hide the loader
      console.error("Error:", error);
    });
}

// Display the types in the popup
function displayTypes(types) {
  const searchInput = document.getElementById("search-input");
  searchInput.style.display = "none"; // Hide the search input initially
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";

  // Add a heading for Types
  const typesHeading = document.createElement("h3");
  typesHeading.textContent = "Types";
  resultsContainer.appendChild(typesHeading);

  for (const type in types) {
    if (types.hasOwnProperty(type)) {
      const div = document.createElement("div");
      div.className = "result-item";
      div.textContent = types[type].name;

      // Create status icon element
      const statusIcon = document.createElement("span");
      statusIcon.className = "status-icon";
      div.appendChild(statusIcon);

      // Append div to resultsContainer before status check
      resultsContainer.appendChild(div);

      // Check the status of each type
      checkTypeStatus(
        types[type]._links["wp:items"][0].href,
        statusIcon,
        div,
        types[type],
      );
    }
  }
}

// Fetch items of a selected type
function fetchItems(endpoint, typeName) {
  showLoader(); // Show the loader
  const modifiedEndpoint = `${endpoint}?per_page=100`;

  fetch(modifiedEndpoint)
    .then((response) => response.json())
    .then((items) => {
      hideLoader(); // Hide the loader
      displayItems(items, typeName); // Pass typeName to displayItems
    })
    .catch((error) => {
      hideLoader(); // Hide the loader
      console.error("Error:", error);
    });
}

// Global variable to hold the current type name for heading updates
let currentTypeName = "";

function displayItems(items, typeName) {
  const searchInput = document.getElementById("search-input");
  searchInput.style.display = "block"; // Make sure to display the search box
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";

  currentTypeName = typeName; // Update global variable
  currentItems = items; // Update global items list

  // Add a dynamic heading based on the type of items being listed
  const itemsHeading = document.createElement("h3");
  itemsHeading.textContent = typeName;
  resultsContainer.appendChild(itemsHeading);

  // Display all items initially
  items.forEach((item) => displayItem(item, resultsContainer));

  // No need to remove the previous listener - just ensure it's properly set up
  // Note: If this still causes issues, you may need to ensure this function isn't adding multiple listeners over time
  searchInput.oninput = handleSearchInput; // Direct assignment
}

// Function to display each item
function displayItem(item, container) {
  const div = document.createElement("div");
  div.className = "result-item";
  div.textContent = item.title.rendered;
  div.onclick = function () {
    chrome.tabs.create({ url: item.link }); // Open in new tab
  };
  container.appendChild(div);
}

// Helper function to get the base URL from the active tab
function getBaseUrl(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const url = new URL(tabs[0].url);
    const baseUrl = `${url.protocol}//${url.host}`;
    callback(baseUrl);
  });
}
