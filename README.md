This is a Node.js server that handles orders for a restaurant. The server provides endpoints for creating, retrieving, updating, and deleting orders. The server also provides a web interface for customers to place orders.

## Installation
To install the server, you will need to have Node.js and npm installed on your system. You can download Node.js from the official website: https://nodejs.org/en/download/

Once you have Node.js installed, you can install the server by running the following command in your terminal:

```
npm install
```

This will install all the dependencies required by the server.

Make a .env file with the following auth information for an empty MongoDB colltion

```
MONGO_DB_USERNAME = ...
MONGO_DB_PASSWORD = ...
MONGO_DB_NAME = ...
MONGO_COLLECTION = ...
```

## Usage

To start the server, run the following command in your terminal:

node restaurantServer.js [portNumber] [jsonFile]

Replace [portNumber] with the port number you want the server to listen on, and replace [jsonFile] with the path to the JSON file containing the menu items.

Once the server is running, you can access the web interface by opening a web browser and navigating to http://localhost:[portNumber]/. From there, you can place orders and view the status of existing orders.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

This project is a mashup of two different school projects I did at University of Maryland. Special thanks to our professor for providing guidance and support throughout the projects.