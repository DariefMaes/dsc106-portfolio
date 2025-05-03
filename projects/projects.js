import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON("../lib/projects.json");

const projectsContainer = document.querySelector(".projects");

renderProjects(projects, projectsContainer, "h2");

let selectedYear = null;
let pieChartData = [];
let query = "";

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  pieChartData = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(pieChartData);
  let arcs = arcData.map((d) => arcGenerator(d));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let svg = d3.select("svg");
  svg.selectAll("path").remove();
  arcs.forEach((arc, idx) => {
    let year = pieChartData[idx].label;

    svg
      .append("path")
      .attr("d", arc)
      .attr("fill", colors(idx))
      .attr("class", year === selectedYear ? "selected" : "")
      .on("click", () => {
        selectedYear = selectedYear === year ? null : year;

        let filteredProjects = projects.filter((project) => {
          let matchesQuery = Object.values(project)
            .join("\n")
            .toLowerCase()
            .includes(query.toLowerCase());
          let matchesYear = selectedYear ? project.year === selectedYear : true;
          return matchesQuery && matchesYear;
        });

        renderProjects(filteredProjects, projectsContainer, "h2");
        renderPieChart(filteredProjects);
      });
  });

  let legend = d3.select(".legend");
  legend.selectAll("*").remove();
  pieChartData.forEach((d, idx) => {
    legend
      .append("li")
      .attr("style", `--color:${colors(idx)}`)
      .attr(
        "class",
        d.label === selectedYear ? "legend-item selected" : "legend-item"
      )
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

let searchInput = document.querySelector(".searchBar");

renderPieChart(projects);

searchInput.addEventListener("input", (e) => {
  query = e.target.value;

  let filteredProjects = projects.filter((project) => {
    let matchesQuery = Object.values(project)
      .join("\n")
      .toLowerCase()
      .includes(query.toLowerCase());
    let matchesYear = selectedYear ? project.year === selectedYear : true;
    return matchesQuery && matchesYear;
  });

  renderProjects(filteredProjects, projectsContainer, "h2");
  renderPieChart(filteredProjects);
});
