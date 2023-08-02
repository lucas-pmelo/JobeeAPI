const express = require("express");
const app = express();

const dotenv = require("dotenv");

const connectDatabase = require("./config/database");
const errorMiddleware = require("./middlewares/errors");
const ErrorHandler = require("./utils/errorHandler");

// Configurando o arquivo config.env
dotenv.config({ path: "./config/config.env" });

// Tratando as exceções não tratadas
process.on("uncaughtException", (err) => {
    console.log(`ERROR: ${err.stack}`);
    console.log("Shutting down the server due to uncaught exception");

    process.exit(1);
});

// Conectando ao banco de dados
connectDatabase();

// Configurando o body parser
app.use(express.json());

// Importando todos os arquivos de rotas
const jobs = require("./routes/jobs");

app.use("/api/v1", jobs);

// Cuidando de routes não tratadas
app.all("*", (req, res, next) => {
    next(new ErrorHandler(`${req.originalUrl} route not found`, 404));
});

// Middleware para lidar com erros
app.use(errorMiddleware);

const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
    console.log(
        `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
    );
});

// Lidando com promise rejection não tratada
process.on("unhandledRejection", (err) => {
    console.log(`ERROR: ${err.message}`);
    console.log("Shutting down the server due to unhandled promise rejection");

    server.close(() => {
        process.exit(1);
    });
});
