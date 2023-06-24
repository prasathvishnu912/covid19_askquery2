const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server running successfully on server 3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

app.get("/todos/", async (request, response) => {
  const { search_q = "", status, priority, category } = request.query;

  let spaceStatus = "";
  if (status !== undefined) {
    spaceStatus = status.replace("%20", " ");
  }

  let responseMsg = "";
  let getSqlQuery = "";

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getSqlQuery = `SELECT * 
      FROM todo 
      WHERE priority = '${priority}' 
      AND status = '${spaceStatus}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getSqlQuery = `SELECT * 
      FROM todo 
      WHERE category = '${category}' 
      AND status = '${spaceStatus}';`;
      break;
    case hasCategoryAndPriorityProperties(request.query):
      getSqlQuery = `SELECT * 
      FROM todo 
      WHERE category = '${category}' 
      AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getSqlQuery = `SELECT * 
      FROM todo 
      WHERE status = '${spaceStatus}';`;
      responseMsg = "Status";
      break;
    case hasPriorityProperty(request.query):
      getSqlQuery = `SELECT * 
      FROM todo 
      WHERE priority = '${priority}';`;
      responseMsg = "Priority";
      break;
    case hasCategoryProperty(request.query):
      getSqlQuery = `SELECT * 
      FROM todo 
      WHERE category = '${category}';`;
      responseMsg = "Category";
      break;
    default:
      getSqlQuery = `SELECT * 
      FROM todo 
      WHERE todo LIKE '%${search_q}%';`;
      break;
  }

  let data = await db.all(getSqlQuery);
  if (data.length === 0) {
    response.status(400);
    response.send(`Invalid Todo ${responseMsg}`);
  } else {
    response.send(data);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const sqlQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  let data = await db.get(sqlQuery);
  response.send(data);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const newDate = format(new Date(date), "yyyy-MM-dd");
  console.log(newDate);

  const sqlQuery = `SELECT * FROM todo WHERE due_date = '${newDate}'`;

  let data = await db.all(sqlQuery);
  if (data.length === 0) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(data);
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  let failureResponse = "";
  let isValueUndefined = false;
  switch (true) {
    case status === undefined:
      failureResponse = "Invalid Todo Status";
      isValueUndefined = true;
      break;
    case category === undefined:
      failureResponse = "Invalid Todo Category";
      isValueUndefined = true;
      break;
    case priority === undefined:
      failureResponse = "Invalid Todo Priority";
      isValueUndefined = true;
      break;
    case dueDate === undefined:
      failureResponse = "Invalid Due Date";
      isValueUndefined = true;
      break;
  }

  const sqlQuery = `INSERT INTO todo(id, todo, priority, status, category, due_date)
    VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;

  if (isValueUndefined) {
    response.status(400);
    response.send(failureResponse);
  } else {
    await db.run(sqlQuery);
    response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, category, priority, todo, dueDate } = request.body;

  let failureResStr = "";
  let successResStr = "";
  let sqlQuery = "";

  switch (true) {
    case status !== undefined:
      sqlQuery = `UPDATE todo 
      SET status = '${status}'
      WHERE id = ${todoId};
    `;
      successResStr = "Status";
      failureResStr = "Todo Status";
      break;
    case priority !== undefined:
      sqlQuery = `UPDATE todo 
      SET priority = '${priority}'
      WHERE id = ${todoId};
    `;
      successResStr = "Priority";
      failureResStr = "Todo Priority";
      break;
    case todo !== undefined:
      sqlQuery = `UPDATE todo 
      SET todo = '${todo}'
      WHERE id = ${todoId};
    `;
      successResStr = "Todo";
      failureResStr = "Todo";
      break;
    case category !== undefined:
      sqlQuery = `UPDATE todo 
      SET category = '${category}'
      WHERE id = ${todoId};
    `;
      successResStr = "Category";
      failureResStr = "Todo Category";
      break;
    case dueDate !== undefined:
      sqlQuery = `UPDATE todo 
      SET due_date = '${dueDate}'
      WHERE id = ${todoId};
    `;
      successResStr = "Due Date";
      failureResStr = "Due Date";
      break;
  }

  const postResponse = await db.run(sqlQuery);
  if (postResponse !== null) {
    response.send(`${successResStr} Updated`);
  } else {
    Q;
    response.status(400);
    response.send(`Invalid ${failureResStr}`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const sqlQuery = `DELETE FROM todo WHERE id = ${todoId};`;

  await db.run(sqlQuery);
  response.send("Todo Deleted");
});

module.exports = app;
