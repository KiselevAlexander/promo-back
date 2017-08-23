import uniqid from 'uniqid';
import sharp from 'sharp';
import {OUTPUT} from '../config';
import {USERS} from '../models';


export const routes = (app, router) => {


    router.post('/createsession', (req, res, next) => {
        const id = uniqid();
        const {name, image} = req.body;

        if (!image) {

            res.status(400);
            res.json({
                error: {
                    code: 40001,
                    type: 'data',
                    message: 'Image is required'
                }
            });

            return;
        }

        if (!name) {

            res.status(400);
            res.json({
                error: {
                    code: 40002,
                    type: 'data',
                    message: 'User name is required'
                }
            });

            return;
        }


        const imageBuf = Buffer.from(image.split(',')[1],'base64');

        sharp(imageBuf)
            .resize(1920, 1080)
            .jpeg({progressive: true, quality: 100})
            .toFile(OUTPUT.image + id + '.jpg')
            .then(() => {
                USERS.create({
                    name,
                    session: id,
                    status: 1
                }, {raw: true})
                    .then(() => {

                        res.json({
                            status: 'ok',
                            session: id
                        });

                    })
                    .catch(err => {

                        res.status(500);
                        res.json({
                            error: {
                                code: 50003,
                                type: 'database',
                                message: err.message
                            }
                        });

                    });

            })
            .catch((err) => {

                res.status(500);
                res.json({
                    error: {
                        code: 50001,
                        type: 'image',
                        message: err.message
                    }
                });

            });

    });


    router.put('/start', (req, res, next) => {
        const {session} = req.body;

        ffmpeg
    });


    router.get('/getstatus', (req, res, next) => {

    });


    router.get('/getvideo', (req, res, next) => {

    });

    app.use(router);

};