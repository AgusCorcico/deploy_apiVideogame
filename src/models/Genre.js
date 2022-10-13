const { DataTypes } = require('sequelize');
// Exportamos una funcion que define el modelo
// Luego le injectamos la conexion a sequelize.
module.exports = (sequelize) => {
  // defino el modelo
    sequelize.define('genre', {
        /* no le paso Id porque lo hace solo en este caso, ya que no vamos a tener otros tipos de dato de genero
        salvo los que tenemos en bd*/
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });
};