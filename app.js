/******************************************************************************
 ***
 * ITE5315 – Assignment 2
 * I declare that this assignment is my own work in accordance with Humber Academic Policy.
 * No part of this assignment has been copied manually or electronically from any other source
 * (including web sites) or distributed to other students.
 *
 * Name: Ariunjargal Erdenebaatar     Student ID: N01721372   Date: 2025/10/29
 *
 *
 ******************************************************************************
 **/

const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const exphbs = require("express-handlebars");
const port = process.env.port || 3000;
const { body, validationResult } = require("express-validator");
// Using zlib for compressed JSON loading
const zlib = require("zlib");

// static files
app.use(express.static(path.join(__dirname, "public")));

// setting up view engine as hbs
app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      checkName: (name) => (name ? name : "N/A"),
      inc: (value) => parseInt(value) + 1,
      rowClass: (name) => (name && name.trim() !== "" ? "" : "highlight-row"),
    },
  })
);
app.set("view engine", "hbs");

// Added to use form body
app.use(express.urlencoded({ extended: true }));

let jsonData = null;

// This is function for loading JSON data once and caching it in jsonData variable
function loadJson() {
  if (!jsonData) {
    // Loading JSON synchronously because we need data before responding to requests
    // Also this won't read the file on every request, only the first time
    const data = fs.readFileSync("./airbnb_with_photos.json", "utf8");
    jsonData = JSON.parse(data);
    console.log("JSON data loaded");
  }
  // if jsonData is already loaded, it'll just return the cached data
  return jsonData;
}

// Alternative function to load from compressed JSON file
function loadJsonZip() {
  if (!jsonData) {
    // Using zlib to decompress gzipped JSON file
    const compressed = fs.readFileSync("airbnb_with_photos.json.gz");
    const decompressed = zlib.gunzipSync(compressed);
    const data = decompressed.toString("utf8");
    jsonData = JSON.parse(data);
    console.log("JSON data loaded");
  }
  // if jsonData is already loaded, it'll just return the cached data
  return jsonData;
}

// routes
app.get("/", function (req, res) {
  // Render index view as response
  res.render("index", { title: "Express" });
});

app.get("/users", function (req, res) {
  // Responding with text
  res.send("respond with a resource");
});

// search by id
app.get("/search/id", (req, res) => {
  res.render("searchIdForm", { title: "Search by ID" });
});
app.post(
  "/search/id",
  body("Property_ID")
    .notEmpty()
    .withMessage("Property ID is required")
    .isNumeric()
    .withMessage("Property ID must be a number")
    .trim()
    .escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("searchIdForm", {
        title: "Search by ID",
        errors: errors.array(),
      });
    }

    const id = req.body.Property_ID;
    const data = loadJsonZip();
    const property = data.find((item) => item.id == id);

    if (property) {
      res.render("propertyDetail", { title: "Property Info", property });
    } else {
      res.render("notFound", { title: "Not Found" });
    }
  }
);

// search by name
app.get("/search/name", (req, res) => {
  res.render("searchNameForm", { title: "Search by Property Name" });
});

app.post("/search/name", (req, res) => {
  const name = req.body.name.trim().toLowerCase();
  const data = loadJsonZip();

  const properties = data.filter((item) =>
    item.NAME.toLowerCase().includes(name)
  );

  res.render("searchNameResults", {
    title: `Search Results for "${req.body.name}"`,
    listings: properties,
  });
});

app.get("/viewData", (req, res) => {
  const data = loadJsonZip();
  const limited = data.slice(0, 100);

  res.render("viewData", {
    title: "All Data (Top 100)",
    listings: limited,
  });
});

app.get("/viewData/clean", (req, res) => {
  const data = loadJsonZip();
  const cleaned = data.filter((item) => item.NAME && item.NAME.trim() !== "");
  const limited = cleaned.slice(0, 100);

  res.render("viewDataClean", {
    title: "Clean Data (Top 100)",
    listings: limited,
  });
});

app.get("/viewData/price", (req, res) => {
  res.render("priceForm", { title: "Search by Price Range" });
});
app.post(
  "/viewData/price",
  [
    body("min")
      .notEmpty()
      .withMessage("Minimum price is required")
      .isFloat({ min: 0 })
      .withMessage("Minimum price must be a positive number")
      .toFloat(),
    body("max")
      .notEmpty()
      .withMessage("Maximum price is required")
      .isFloat({ min: 0 })
      .withMessage("Maximum price must be a positive number")
      .toFloat(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("priceForm", {
        title: "Search by Price Range",
        errors: errors.array(),
      });
    }

    const { min, max } = req.body;
    const data = loadJsonZip();

    // Filter records inside range only
    const filtered = data.filter((item) => {
      if (!item.price) return false;

      let cleanPrice = item.price.trim(); // remove leading/trailing spaces
      if (cleanPrice.startsWith("$")) {
        cleanPrice = cleanPrice.substring(1);
      }

      const numericPrice = parseFloat(cleanPrice); // convert to number
      if (isNaN(numericPrice)) return false;

      return numericPrice >= min && numericPrice <= max;
    });

    const limited = filtered.slice(0, 100);

    res.render("priceResults", {
      title: `Airbnb Listings Between $${min} and $${max} (Top 100)`,
      listings: limited,
    });
  }
);

// Fallback route to handle wrong routes
// * is deprecated, using *splat instead
app.get("*splat", function (req, res) {
  res.render("error", { title: "Error", message: "Wrong Route" });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
