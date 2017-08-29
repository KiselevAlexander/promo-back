import moment from 'moment';
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

                const imageSrc = PATHS.image + session + '.jpg';

                console.log(PATHS.videoPatterns + `pattern-${pattern}.mp4`);

                ffmpeg(PATHS.videoPatterns + `pattern-${pattern}.mp4`)
                    .addInput(imageSrc)
                    // .addOption('-filter_complex', '[0:v][1:v]scale2ref:overlay=0:0:enable=\'between(t,4,8)\'')
                    .addOption('-filter_complex', '[1][0]scale2ref[i][m];[m][i]overlay=0:0:enable=\'between(t,4,8)\'[v]')
                    .addOption('-map', '[v]')
                    .addOption('-map', '0:a?')
                    .on('start', function(commandLine) {
                        USERS.update({
                                status: 2,
                                start: moment()
                            },
                            {
                                where: {
                                    session
                                }
                            })
                            .then(() => {
                                console.log('Spawned Ffmpeg with command: ' + commandLine);
                                res.json({
                                    status: 'ok',
                                    session: session
                                })
                            })
                    })
                    .on('progress', function(progress) {
                        try {
                            USERS.update({
                                    status: 2,
                                    perc: progress.percent
                                },
                                {
                                    where: {
                                        session
                                    }
                                })
                                .then(() => {
                                    console.log('Processing `' + session + ': ' + progress.percent + '% done');
                                })
                        } catch (err) {
                            
                        }
                    })
                    .on('end', function(error) {
                        USERS.update({
                                status: 3,
                                end: moment()
                            },
                            {
                                where: {
                                    session
                                }
                            })
                            .then(() => {
                                console.log('*****OK    ');
                            })
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


    router.post('/getstatus', (req, res, next) => {

        const {session} = req.body;

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

                res.json({
                    userID: data.id,
                    session,
                    start: data.start,
                    status: data.status,
                    perc: data.perc
                });
            })
    });


    router.get('/getvideo', (req, res, next) => {

    });

    app.use(router);

};