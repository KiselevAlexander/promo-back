import uniqid from 'uniqid';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import {PATHS} from '../config';
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
            .toFile(PATHS.image + id + '.jpg')
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
        const {session, pattern} = req.body;

        if (!session) {

            res.status(400);
            res.json({
                error: {
                    code: 40003,
                    type: 'data',
                    message: 'Session ID is required'
                }
            });

        }

        if (!pattern) {

            res.status(400);
            res.json({
                error: {
                    code: 40004,
                    type: 'data',
                    message: 'Pattern is required'
                }
            });

        }
        USERS.findOne({
            where: {
                session
            },
            raw: true
        })
            .then((data) => {

                if (!data) {

                    res.status(400);
                    res.json({
                        error: {
                            code: 40005,
                            type: 'session',
                            message: 'Session ID not found'
                        }
                    });

                    return;

                }

                if (data.status !== 1) {

                    res.status(400);
                    res.json({
                        error: {
                            code: 40005,
                            type: 'session',
                            message: 'Image wasn\'t loaded'
                        }
                    });

                    return;

                }

                const imageSrc = PATHS.image + session + '.jpg';

                console.log(PATHS.videoPatterns + `pattern-${pattern}.mp4`);

                ffmpeg(PATHS.videoPatterns + `pattern-${pattern}.mp4`)
                    .addInput(imageSrc)
                    .addOption('-filter_complex', '[0:v][1:v]overlay=0:0:enable=\'between(t,4,8)\'')
                    .on('start', function(commandLine) {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                        res.json({
                            status: 'ok'
                        })
                    })
                    .on('progress', function(progress) {
                        console.log('Processing `' + session + ': ' + progress.percent + '% done');
                    })
                    .on('end', function(error) {
                        console.log('*****OK    ');
                    })
                    .on('error', function(error) {

                        console.log(error);

                        // res.status(500);
                        // res.json({
                        //     error: {
                        //         code: 50004,
                        //         type: 'video',
                        //         message: error.message
                        //     }
                        // });

                    })
                    .saveToFile(PATHS.video + session + '.mp4');

            })
            .catch((err) => {

                res.status(500);
                res.json({
                    error: {
                        code: 50004,
                        type: 'database',
                        message: err
                    }
                });

            });


    });


    router.get('/getstatus', (req, res, next) => {

    });


    router.get('/getvideo', (req, res, next) => {

    });

    app.use(router);

};