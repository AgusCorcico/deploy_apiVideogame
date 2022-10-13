require("dotenv").config();
const { API_KEY } = process.env;
const { Router } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const axios = require('axios');

const { Videogame, Genre } = require('../db')


const router = Router();

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);
const getApiInfo = async () => {
    let result = []; //uno por uno con su respectiva info
    let gets = []; //5 paginas de 20c/u = 100 arreglos de videojuegos
    let page = [1, 2, 3, 4, 5];

    page.forEach((e) => {
        gets.push(
        axios.get(`https://api.rawg.io/api/games?key=${API_KEY}&page=${e}`)
        );
    });

    await Promise.all(gets)
      .then((e) => { //100
        e.forEach((e) => {
            let res = e.data;
            result.push(
            ...res.results.map((e) => {
                const objInfo ={

                    id: e.id,
                    image: e.background_image,
                    name: e.name,
                    released: e.released,
                    rating: e.rating,
                    platforms: e.platforms.map(e => e.platform.name),
                    genres: e.genres.map( e => e.name),
                    description: e.description,
                    
                }
                    
                return objInfo;
            })
        );
        });
    })
    .then(() => result)
    .catch((error) => console.log(error));
    return result;
}

const getDbInfo = async () => {
    return await Videogame.findAll({
        include: {
            model: Genre,
            attributes: ['name'],
            through: {
                attributes: [], /* trae name de los atributos */
            },
        },
    })
};

const getAllVideogames = async() => {
    const apiInfo = await getApiInfo();
    const dbInfo = await getDbInfo();

    const infoTotal = apiInfo.concat(dbInfo);

    return infoTotal;
}

//------------------------------ ROUTES --------------------------------------------------------\\

/* GET ALL VIDEOGAMES */
router.get('/videogames', async (req,res) =>{

    try {
        const { name } = req.query;
        let videogameAllName = await axios.get(`https://api.rawg.io/api/games?search=${name}&key=46cb4bc503654227a6f6692ade4a82eb`);
        if (name) {
            let videogameName = videogameAllName.data.results.filter(data => data.name.toLowerCase().includes(name.toLowerCase()));
            videogameName = videogameName.slice(0, 15);
            videogameName = videogameName.map(data => {
                return {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    released: data.released,
                    rating: data.rating,
                    image: data.background_image,
                    platforms: data.platforms?.map(data => data.platform.name),
                    genres: data.genres?.map(data => data.name)
                }
            });
            let videogameDb = await Videogame.findAll({ //se busca todas las coincidencias en la DB donde coincida su nombre con lo que me pasan por body
                where: {
                    name: name
                },
                include: Genre
            })
            videogameDb = videogameDb.map(({ id, name, released, rating, genres, image}) => ({
                id,
                name,
                released,
                rating,
                genres: genres.map((genre) => genre.name),
                image
            }));
            videogameName = videogameDb.concat(videogameName)
            if (videogameName.length) {
                return res.status(200).json(videogameName)
            } else {
                return res.json({err:"No existe ese videojuego"});
            }
        } else {
            let allVideogames = await getAllVideogames();
            res.status(200).json(allVideogames);
        }
    } catch (error) {
        console.log(error)
    }
});
/* GET GENRES AND SAVE IN DB*/
router.get('/genres', async (req,res) =>{
    const genresApi = await axios.get('https://api.rawg.io/api/genres?key=4a654b64c98046ea932e3e617b6c47a6');
    const genres = await genresApi.data.results.map(el=> el.name)

    genres.forEach(el => Genre.findOrCreate({
        where: { name : el}
        })
    );
    const allGenres = await Genre.findAll();
    res.send(allGenres);

})

/* POST VIDEOGAME */
router.post('/videogame', async (req,res)=>{
    const { id,name, description, released, image, rating, createdInDb, genres } = req.body


    let videogameCreated = await Videogame.create({
        id,
        name,
        description,
        released,
        image,
        rating,
        createdInDb,
    })
/* el genero se lo paso a traves del modelo de generos de mi db*/
    let genreDb = await Genre.findAll({  
        where: { name : genres }
    })
    /* agrego el genero a mi videogame */
    videogameCreated.addGenre(genreDb) /* addGenre es un metodo de sequalize que me trae de mi table lo que le paso entre () */

    /* res.send("The videogame has been created"); */
    res.json(videogameCreated)
})

/* GET VIDEOGAME BY ID */
/* router.get('/videogames/:id', async (req,res)=>{
    const id = req.params.id;
    const videogamesTotal = await getAllVideogames()
    if(id){
        let videogameId = await videogamesTotal.filter(el=> el.id == id)
        videogameId.length?
        res.status(200).send(videogameId) :
        res.status(404).send('Videogame not found')
    }
}) */

router.get('/videogames/:id', async (req,res)=>{
    const id = req.params.id;
    
    if(id.length > 9){
        let dbGameInfo = await Videogame.findOne({
            where:{ id: id},
            include: Genre
        })
    
        let gameDb ={
            image: dbGameInfo.image,
            name: dbGameInfo.name,
            released: dbGameInfo.released,
            rating: dbGameInfo.rating,
            genres: dbGameInfo.genres?.map(e => e.name),
            description: dbGameInfo.description
        }
        res.send(gameDb)
    }
    else{
        const videoGameInfoId = await axios.get(`https://api.rawg.io/api/games/${id}?key=${API_KEY}`);
        let gameDetail ={
            image: videoGameInfoId.data.background_image,
            name: videoGameInfoId.data.name,
            released: videoGameInfoId.data.released,
            rating: videoGameInfoId.data.rating,
            genres: videoGameInfoId.data.genres.map(e => e.name),
            description: videoGameInfoId.data.description,
        }
    
    res.status(200).send(gameDetail)
      //res.status(404).send("VideoGame By Id Not Found")
    }
})

module.exports = router;
