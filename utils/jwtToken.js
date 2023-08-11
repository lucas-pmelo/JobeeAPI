// Criar e enviar o token e salvar no cookie
const sendToken = (user, statusCode, res) => {
    // Criando o token JWT
    const token = user.getJwtToken();
    console.log(user);

    // Opções para o cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    // if (process.env.NODE_ENV === "production") {
    //     options.secure = true;
    // }

    res.status(statusCode).cookie("token", token, options).json({
        success: true,
        token
    });
};

module.exports = sendToken;
