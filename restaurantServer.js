/**
 * @file restaurantServer.js - A Node.js server that handles orders for a restaurant.
 * @author Jared Williams
 * @version 1.0.0
 * @license MIT
 */

/**
 * Represents an order placed by a customer.
 */
class Order {
    name; 
    tableNum; 
    delivery; 
    items; 
    info;
    total; 
    #table; /* private */

  /**
   * Creates a new Order object.
   * @param {String} name - The name of the customer who placed the order.
   * @param {Number} tableNum - The table number where the customer is seated.
   * @param {Boolean} delivery - Whether the order is for delivery or dine-in.
   * @param {Array} items - An array of strings representing the items ordered by the customer.
   * @param {String} info - Additional information about the order (optional).
   */
    constructor(name, tableNum, delivery, items, info) {
       this.name = name;
       this.tableNum = tableNum;
       this.delivery = delivery;
       this.items = items;
       this.info = info;
       this.total = 0;
       this.#table = "<style>table, th, td {border: .071428rem solid black;}</style><table><tr><th>Item</th><th>Cost</th></tr>";
       let idx;
       let cost;
       items.forEach((element) => {
        idx = itemsDict["itemsList"].findIndex((elem) => { 
            return elem.name == element;
        });
        cost = itemsDict["itemsList"][idx]["cost"];
        this.#table += `<tr><td>${element}</td><td>${cost.toFixed(2)}</td></tr>`;
        this.total += cost
      });
      this.#table += `<tr><td>Total Cost</td><td>${this.total.toFixed(2)}</td></tr></table>`;
      
    }
  /**
   * Returns an HTML table representing the items ordered and the total cost.
   * @returns {String} An HTML table representing the items ordered and the total cost.
   */
    returnTable() {
        return this.#table
    }

 }

let fs = require("fs");
const http = require("http");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser"); /* To handle post parameters */
const app = express();  /* app is a request handler function */

require("dotenv").config({ path: path.resolve(__dirname, '.env') })

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};

//const { MongoClient, ServerApiVersion } = require('mongodb');
const { MongoClient } = require("mongodb");

//const uri = `mongodb+srv://${userName}:${password}@cluster0.mmvm8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${userName}:${password}@jwpersonalwebsite.w59ayfg.mongodb.net/?retryWrites=true&w=majority`;

//const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const client = new MongoClient(uri);



app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

if (process.argv.length != 4) {
    process.stdout.write(`Usage summerCampServer.js portNumber jsonFile`);
    process.exit(1);
  }
  
const portNumber = process.argv[2];

let fileName = process.argv[3];

/* Notice Sync word in method */
let fileContent = fs.readFileSync(fileName, 'utf-8');

let itemsDict = JSON.parse(fileContent);
let itemStringPrint = "[\n";
let catalogTable = "<style>table, th, td {border: .071428rem solid black;}</style><table><tr><th>Item</th><th>Cost</th></tr>";
let selectMultiple = "";

itemsDict["itemsList"].forEach((element) => {
    itemStringPrint += `  { name: '${element.name}', cost: ${element.cost} },\n`;
    catalogTable += `<tr><td>${element.name}</td><td>${element.cost.toFixed(2)}</td></tr>`;
    selectMultiple += `<option value=\"${element.name}\">${element.name}</option>`;
  });
  itemStringPrint = itemStringPrint.slice(0, -2);
  itemStringPrint += "\n]";
  catalogTable += "</table>";


process.stdout.write(`Web server started and running at http://localhost:${portNumber}\n`);
const prompt = "Stop to shutdown the server: "
process.stdout.write(prompt);
process.stdin.setEncoding("utf8");
process.stdin.on('readable', () => { 
	let dataInput = process.stdin.read();
	if (dataInput !== null) {
		let command = dataInput.trim();
		if (command === "stop") {
            process.stdout.write("Shutting down the server\n");
            process.exit(0);
        } else {
            process.stdout.write(`Invalid command: ${command}\n`);
		}
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

/**
 * Handles GET requests to the / endpoint.
 * Displays the order and admin options (index.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.get("/", (request, response) => { 
  response.render("index");
});

/**
 * Handles GET requests to the /menu endpoint.
 * Displays the available menu items for orders (displayItems.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.get("/menu", (request, response) => { 
    const variables = {
        itemsTable: catalogTable
      };

    response.render("displayItems", variables);
});


/**
 * Handles GET requests to the /order endpoint.
 * Displays the order submission form (placeOrder.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.get("/order", (request, response) => { 
    const variables = {
        items: selectMultiple
      };

    response.render("placeOrder", variables);
 });


/**
 * Inserts a new order into the database.
 * @param {Object} newOrder - The order object to be inserted into the database.
 * @returns {Promise} A Promise that resolves with the ID of the inserted order.
 */
 async function insertOrder(newOrder) {
  try {
      const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newOrder);
      console.log(`Order entry created with id ${result.insertedId}`);
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

/**
 * Handles POST requests to the /order endpoint.
 * Calls insertOrder to insert a new order into the database.
 * Displays the order confirmation (orderConfirmation.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.post("/order", (request, response) => { 
    let {name, tableNum, delivery, itemsSelected, orderInformation} =  request.body;
    //console.log(name);
    let orderSubmitted = new Order(name, tableNum, delivery, itemsSelected, orderInformation);
    const variables = {
        name: orderSubmitted.name,
        tableNum: orderSubmitted.tableNum,
        delivery: orderSubmitted.delivery,
        orderTable: orderSubmitted.returnTable()
      };
    let newOrder = {
      name: orderSubmitted.name,
      tableNum: orderSubmitted.tableNum,
      delivery: orderSubmitted.delivery,
      total: orderSubmitted.total,
      orderTable: orderSubmitted.returnTable()
    };
    insertOrder(newOrder);
    response.render("orderConfirmation", variables);
 });

/**
 * Handles GET requests to the /reviewOrder endpoint.
 * Displays the order review form where users enter their name or table number (reviewOrder.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
 app.get("/reviewOrder", (request, response) => { 
  response.render("reviewOrder");
});

/**
 * Queries the database for an order with the given name or table number.
 * @param {string} name - The name of the order to be queried.
 * @param {string} tableNum - The table number of the order to be queried.
 * @returns {Array} An array of matching orders.
 */
async function queryNameOrTableNum(name, tableNum) {
  try {
      await client.connect();
      if (name == null && tableNum == null) {
        let filter = {name: name, tableNum: tableNum};
      } else if (tableNum == null) {
        let filter = {name: name};
      } else if (name == null) {
        let filter = {tableNum: tableNum};
      } else {
        let filter = {};
      }
      const result = await client.db(databaseAndCollection.db)
                          .collection(databaseAndCollection.collection)
                          .findOne(filter);
      return result;
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

/**
 * Handles POST requests to the /reviewOrder endpoint.
 * Calls queryNameOrTableNum to query the database for an order with the given name or table number.
 * Displays the order confirmation (orderConfirmation.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.post("/reviewOrder", (request, response) => { 
  (async () => {
    let variables = {}
    let {name, tableNum} =  request.tableNum;
    let foundOrder = await queryNameOrTableNum(name, tableNum);
    if (foundOrder == null) {
      variables = {
        name: "NONE",
        tableNum: "NONE",
        delivery: "NONE",
        orderTable: "NONE"
      };
    } else {
      variables = {
        name: foundOrder.name,
        tableNum: foundOrder.tableNum,
        delivery: foundOrder.delivery,
        orderTable: foundOrder.orderTable
      };
    }
    response.render("orderConfirmation", variables);
  })();
});

/**
 * Handles GET requests to the /adminTotalQuery endpoint.
 * Displays the admin total query form (adminTotalQuery.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.get("/adminTotalQuery", (request, response) => { 
  response.render("adminTotalQuery");
});

/**
 * Queries the database for orders with a total greater than or equal to the given total threshold.
 * @param {number} totalThreshold - The total threshold for the query.
 * @returns {Array} An array of matching orders.
 */
async function queryTotal(totalThreshold) {
  try {
      await client.connect();
      let filter = {total: { $gte: Number(totalThreshold)}};
      console.log(filter);
      const cursor = await client.db(databaseAndCollection.db)
                          .collection(databaseAndCollection.collection)
                          .find(filter);
      const result = await cursor.toArray();
      return result;
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

/**
 * Handles POST requests to the /adminTotalQuery endpoint.
 * Calls queryTotal to query the database for orders with a total greater than or equal to the given total threshold.
 * Displays the matching orders (adminTotalDisplay.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.post("/adminTotalQuery", (request, response) => { 
  (async () => {
    let {total} =  request.body;
    let foundOrders = await queryTotal(total);
    console.log(foundOrders)
    buildOrdersDisplay = ""
    foundOrders.forEach((element) => {
      buildOrdersDisplay += `<strong>Name: </strong>${element.name}<br><strong>Table Number: </strong>${element.tableNum}<br><strong>Delivery Method: </strong>${element.delivery}<br>${element.orderTable}<br><br>`;
    });
    const variables = {
      buildOrdersDisplay: buildOrdersDisplay
    };
    response.render("adminTotalDisplay", variables);
  })();
});

/**
 * Handles GET requests to the /adminRemove endpoint.
 * Displays the form confirming the removal of all entries from the given collection (removeOrders.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.get("/adminRemove", (request, response) => { 
  response.render("removeOrders");
});

/**
 * Removes all entries from the given collection.
 * @returns {number} The number of entries removed.
 * @throws {Error} If the database connection fails.
 */
async function removeAll() {
  try {
      await client.connect();
      const result = await client.db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .deleteMany({});
      return result.deletedCount;
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

/**
 * Handles POST requests to the /adminRemove endpoint.
 * Calls removeAll to remove all entries from the given collection.
 * Displays the number of entries removed (removalComplete.ejs).
 * @param {Object} request - The HTTP request object.
 * @param {Object} response - The HTTP response object.
 */
app.post("/adminRemove", (request, response) => { 
  (async () => {
    let numberRemoved = await removeAll();
    const variables = {
      numberRemoved: numberRemoved
    };
    response.render("removalComplete", variables);
  })();
});
 
app.listen(portNumber);