import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123aman",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users;

db.query("SELECT * FROM users", (err, res) => {
  if(err) console.log(err);
  else {
    users = res.rows;
  }
})

// let users = [
//   { id: 1, name: "Aman", color: "teal" },
//   { id: 2, name: "Zack", color: "powderblue" },
// ];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries AS vc JOIN users ON users.id = vc.id where vc.id = $1;", [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users where id = $1;", [currentUserId]);
  return result.rows[0];
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  console.log(currentUser);
  console.log(countries);

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  console.log(input);
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    const countries = await checkVisisted();
    // Removing Duplicate countries
    countries.forEach((country) => {
      if(country === countryCode) {
        console.log("Country have already Marked");
        res.redirect('/');
      }
    })
    try {
      await db.query(
        "INSERT INTO visited_countries (id, country_code) VALUES ($1, $2)",
        [currentUserId, countryCode]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if(req.body.add === "new") {
    res.render("new.ejs");
  }
  else {
    currentUserId = req.body.user;
    // console.log(`checking: ${JSON.stringify(currentUserId)}`);
    res.redirect('/');
  }
});

app.post("/new", async (req, res) => {
  const newUserName = req.body.name;
  const newUserColor = req.body.color;

  try {
    const result = await db.query(
      'INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id;', [newUserName, newUserColor]
    );
    const newUserId = result.rows[0].id;
    const newUserData = {id: newUserId, name: newUserName, color: newUserColor};
    users.push(newUserData);
    console.log(users);
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
