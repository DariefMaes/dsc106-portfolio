import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let yScale, xScale;

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];

      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        author,
        date,
        time,
        timezone,
        datetime,
        url: "https://github.com/dariefmaes/dsc106-portfolio/commit/" + commit,
        hourfrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
      Object.defineProperty(ret, "lines", {
        value: lines,
        writable: true,
        enumerable: false,
        configurable: true,
      });

      return ret;
    })
    .sort((a, b) => b.datetime - a.datetime);
}

function renderTooltipContent(commit) {
  const link = document.getElementById("commit-link");
  const date = document.getElementById("commit-date");

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString("en", {
    dateStyle: "full",
  });
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function brushed(event) {
  console.log(event);
  const selection = event.selection;

  d3.selectAll("circle").classed("selected", (d) =>
    isCommitSelected(selection, d)
  );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourfrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function createBrushSelector(svg) {
  svg.call(d3.brush());

  svg.call(d3.brush().on("start brush end", brushed));

  svg.selectAll(".dots, .overlay ~ *").raise();
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();
  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([4, 20]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`);

  gridlines.call(
    d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width)
  );

  svg
    .append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .attr("class", "x-axis") // new line to mark the g tag
    .call(xAxis);

  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .attr("class", "y-axis") // just for consistency
    .call(yAxis);

  const dots = svg.append("g").attr("class", "dots");
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourfrac))
    .attr("r", (d) => rScale(d.totalLines))
    .style("fill-opacity", 0.7)
    .attr("fill", "steelblue")
    .on("mouseenter", (event, commit) => {
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", () => {
      updateTooltipVisibility(false);
    });

  createBrushSelector(svg);
}

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select("#stats").append("dl").attr("class", "stats");

  // Add total LOC
  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);

  // Add total commits
  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  // Longest line
  dl.append("dt").text("Longest line");
  dl.append("dd").text(Math.max(...data.map((d) => d.length)));

  // Number of files in codebase
  dl.append("dt").text("Number of files in codebase");
  dl.append("dd").text(d3.group(data, (d) => d.file).size);

  //   Average line length
  dl.append("dt").text("Average line length");
  dl.append("dd").text(d3.mean(data, (d) => d.length).toFixed(2));
}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  const svg = d3.select("#chart").select("svg");

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([4, 20]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select("g.dots");
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourfrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector("#selection-count");
  countElement.textContent = `${
    selectedCommits.length || "No"
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById("language-breakdown");

  if (selectedCommits.length === 0) {
    container.innerHTML = "";
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Update DOM with breakdown
  container.innerHTML = "";

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format(".1~%")(proportion);

    container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
  }
}

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });

  let filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append("div").call((div) => {
        div.append("dt").append("code");
        div.append("dd");
      })
    );

  filesContainer
    .select("dt")
    .html(
      (d) =>
        `<code>${d.name}</code><small class='line-indication'>${d.lines.length} lines</small>`
    );

  filesContainer
    .select("dd")
    .selectAll("div")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr("style", (d) => `--color: ${colors(d.type)}`);
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);

renderScatterPlot(data, commits);

let commitProgress = 100;

let filteredCommits = commits;

let lines = filteredCommits.flatMap((d) => d.lines);
let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  })
  .sort((a, b) => b.lines.length - a.lines.length);

let filesContainer = d3
  .select("#files")
  .selectAll("div")
  .data(files, (d) => d.name)
  .join((enter) =>
    enter.append("div").call((div) => {
      div.append("dt").append("code");
      div.append("dd");
    })
  );

filesContainer
  .select("dt")
  .html(
    (d) =>
      `<code>${d.name}</code><small class='line-indication'>${d.lines.length} lines</small>`
  );

let colors = d3.scaleOrdinal(d3.schemeTableau10);

filesContainer
  .select("dd")
  .selectAll("div")
  .data((d) => d.lines)
  .join("div")
  .attr("class", "loc")
  .attr("style", (d) => `--color: ${colors(d.type)}`);

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

// const slider = document.getElementById("commit-progress");

// function onTimeSliderChange() {
//   commitProgress = slider.value;
//   commitMaxTime = timeScale.invert(commitProgress);
//   commitTime.textContent = commitMaxTime.toLocaleString("en", {
//     dateStyle: "full",
//     timeStyle: "short",
//   });

//   filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
//   updateScatterPlot(data, filteredCommits);
//   updateFileDisplay(filteredCommits);
// }

// slider.addEventListener("input", onTimeSliderChange);
// onTimeSliderChange();

d3.select("#scatter-story")
  .selectAll(".step")
  .data(commits)
  .join("div")
  .attr("class", "step")
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString("en", {
      dateStyle: "full",
      timeStyle: "short",
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? "another glorious commit" : "my first commit, and it was glorious"
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`
  );

d3.select("#file-story")
  .selectAll(".step")
  .data(commits)
  .join("div")
  .attr("class", "step")
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString("en", {
      dateStyle: "full",
      timeStyle: "short",
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? "another glorious commit" : "my first commit, and it was glorious"
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`
  );

function onStepEnter(response) {
  console.log(response.element.__data__.datetime);
  commitProgress = timeScale(response.element.__data__.datetime);
  console.log("Commit progress", commitProgress);
  commitMaxTime = timeScale.invert(commitProgress);
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

const scroller = scrollama();
scroller
  .setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
  })
  .onStepEnter(onStepEnter);

scroller
  .setup({
    container: "#scrolly-2",
    step: "#scrolly-2 .step",
  })
  .onStepEnter(onStepEnter);
