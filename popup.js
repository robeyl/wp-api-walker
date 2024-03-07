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

let allItems = [];

function handleSearchInput() {
  const searchTerm = this.value.toLowerCase();
  const resultsContainer = document.getElementById("results");

  // Clear existing items and re-add the heading
  resultsContainer.innerHTML = `<h3>${currentTypeName}</h3>`;

  const filteredItems = allItems.filter((item) =>
    item.title.rendered.toLowerCase().includes(searchTerm),
  );
  filteredItems.forEach((item) => displayItem(item, resultsContainer));
}

function fetchTotalCount(endpoint) {
  const countEndpoint = `${endpoint}?per_page=1`;

  return fetch(countEndpoint)
    .then((response) => {
      const totalCount = response.headers.get("X-WP-Total");
      if (totalCount) {
        return parseInt(totalCount, 10);
      } else {
        throw new Error("Total count header not found");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      return 0;
    });
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
        fetchItems(type._links["wp:items"][0].href, type.name, 1);
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
  typesHeading.textContent = `Types (${Object.keys(types).length})`;
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
function fetchItems(endpoint, typeName, page = 1) {
  showLoader();

  fetchTotalCount(endpoint)
    .then((totalCount) => {
      const modifiedEndpoint = `${endpoint}?per_page=40&page=${page}`;

      fetch(modifiedEndpoint)
        .then((response) => response.json())
        .then((items) => {
          hideLoader();
          allItems = allItems.concat(items);
          displayItems(items, typeName, endpoint, page, totalCount);
        })
        .catch((error) => {
          hideLoader();
          console.error("Error:", error);
        });
    })
    .catch((error) => {
      hideLoader();
      console.error("Error:", error);
    });
}

// Global variable to hold the current type name for heading updates
let currentTypeName = "";

function displayItems(items, typeName, endpoint, page, totalCount) {
  const searchInput = document.getElementById("search-input");
  searchInput.style.display = "block";
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = ""; // Clear previous content

  currentTypeName = typeName;

  const itemsHeading = document.createElement("h3");
  itemsHeading.textContent = `${typeName} (${items.length} of ${totalCount})`;
  resultsContainer.appendChild(itemsHeading);

  // Append each item to the resultsContainer
  items.forEach((item) => displayItem(item, resultsContainer));

  searchInput.oninput = handleSearchInput;

  // Add Next/Prev navigation buttons
  const navContainer = document.createElement("div");
  navContainer.className = "nav-container";

  const prevButton = document.createElement("button");
  prevButton.textContent = "Prev";
  prevButton.disabled = page === 1;
  prevButton.onclick = () => fetchItems(endpoint, typeName, page - 1);
  navContainer.appendChild(prevButton);

  const nextButton = document.createElement("button");
  nextButton.textContent = "Next";
  nextButton.disabled = items.length < 40;
  nextButton.onclick = () => fetchItems(endpoint, typeName, page + 1);
  navContainer.appendChild(nextButton);

  resultsContainer.appendChild(navContainer);
}

// Function to display each item
function displayItem(item, container) {
  const div = document.createElement("div");
  div.className = "result-item";

  // Decode HTML entities in the title
  const decodedTitle = he.decode(item.title.rendered);

  div.textContent = decodedTitle;
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
