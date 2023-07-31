const express = require("express");
const app = express();

const dotenv = require("dotenv");

const connectDatabase = require("./config/database");

// Configurando o arquivo config.env
dotenv.config({ path: "./config/config.env" });

// Conectando ao banco de dados
connectDatabase();

// configurando o body parser
app.use(express.json());

// Importando todos os arquivos de rotas
const jobs = require("./routes/jobs");

app.use("/api/v1", jobs);

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(
        `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
    );
});
