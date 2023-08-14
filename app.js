const express = require("express");
const app = express();

const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const bodyParser = require("body-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

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
app.use(bodyParser.urlencoded({ extended: true }));

// Configurando o swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Configurando o helmet
app.use(helmet());

// Configurando o body parser
app.use(express.json());

// Configurando o cookie parser
app.use(cookieParser());

// Configurando o file upload
app.use(fileUpload());

// Configurando o express mongo sanitize
app.use(mongoSanitize());

// Configurando o xss clean
app.use(xssClean());

// Configurando o hpp
app.use(
    hpp({
        whitelist: ["positions"]
    })
);

// Configurando o rate limit
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 100 // 100 requisições
});

// Configurando o cors
app.use(cors());

app.use(limiter);

// Importando todos os arquivos de rotas
const jobs = require("./routes/jobs");
const auth = require("./routes/auth");
const user = require("./routes/user");

app.use("/api/v1", jobs);
app.use("/api/v1", auth);
app.use("/api/v1", user);

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
