
class Order {
    name; 
    tableNum; 
    delivery; 
    items; 
    info; /* private */
    total; 
    #table; 

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

app.get("/", (request, response) => { 
  response.render("index");
});

//This endpoint displays the displayItems.ejs 
// template with the table of items available.
app.get("/menu", (request, response) => { 
    const variables = {
        itemsTable: catalogTable
      };

    response.render("displayItems", variables);
});


//This endpoint displays the placeOrder.ejs 
// template with the table of items available.
app.get("/order", (request, response) => { 
    const variables = {
        items: selectMultiple
      };

    response.render("placeOrder", variables);
 });

 // This endpoint will process the submission of the placeOrder form, 
// retrieving the order values and processing the order. Processing an order
// requires displaying the orderConfirmation.ejs template with a table that 
// includes the items to be purchased, along with their cost. The last table
// row has the sum of all the items in the order.
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


 app.get("/reviewOrder", (request, response) => { 
  response.render("reviewOrder");
});

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

app.get("/adminTotalQuery", (request, response) => { 
  response.render("adminTotalQuery");
});

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

app.get("/adminRemove", (request, response) => { 
  response.render("removeOrders");
});

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