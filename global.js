console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// const navLinks = $$("nav a");
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );

// if (currentLink) {
//   currentLink.classList.add("current");
// }

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/dsc106-portfolio/";

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "https://github.com/DariefMaes", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  url = !url.startsWith("http") ? BASE_PATH + url : url;
  console.log(url);

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;
  nav.append(a);

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  if (a.host !== location.host) {
    a.target = "_blank";
  }
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
    `
);

const select = document.querySelector("select");
if ("colorScheme" in localStorage) {
  console.log("Color scheme from localStorage", localStorage.colorScheme);
  document.documentElement.style.setProperty(
    "color-scheme",
    localStorage.colorScheme
  );
  select.value = localStorage.colorScheme;
}
select.addEventListener("input", (e) => {
  console.log("Color scheme changed to", e.target.value);
  document.documentElement.style.setProperty("color-scheme", e.target.value);
  localStorage.colorScheme = e.target.value;
});

const form = document.querySelector("form");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  let url = form.action + "?";
  console.log("Form data", url);

  for (let [name, value] of data.entries()) {
    console.log(name, encodeURIComponent(value));
    url += `${name}=${encodeURIComponent(value)}&`;
  }

  console.log(url);

  location.href = url;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
  }
}

export function renderProjects(project, containerElement, headingLevel = "h2") {
  if (!containerElement) {
    return;
  }

  const headings = ["h1", "h2", "h3", "h4", "h5", "h6"];
  if (!headings.includes(headingLevel)) {
    console.error(`Invalid heading level: ${headingLevel}`);
    headingLevel = "h2";
  }

  containerElement.innerHTML = "";
  if (!project || project.length == 0) {
    containerElement.innerHTML = `<p>No projects found.</p>`;
    return;
  }

  const title = document.querySelector(".projects-title");
  if (title) {
    title.textContent = `${project.length} Projects`;
  }

  for (let p of project) {
    const article = document.createElement("article");
    article.innerHTML = `
      <${headingLevel}>${p.title ?? "Untitled Project"}</${headingLevel}>
      <img  src="${p.image}" alt="${p.title ?? "Project Image"}" />
      <p>${p.description ?? "No description provided"}</p>`;
    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
