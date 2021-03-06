import moment from 'moment';
import fs from 'fs';
import uniqid from 'uniqid';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import {STATIC_PATH, PATHS, PUBLIC_URL} from '../config';
import {USERS} from '../models';
import adminRoutes from './admin';

const OG = {
    title: 'Создай свою мечту вместе с ИНГОССТРАХ',
    description: 'Создай свою мечту вместе с ИНГОССТРАХ',
    image: 'image_url',
    url: 'site_url'
};

const FRAME_RANGE = {
    start: 19,
    end: 25
};


const renderStatic = (req, res) => {
    fs.readFile(`${STATIC_PATH}/index.html`, (err, data) => {

        let tpl = Buffer(data).toString('utf-8');

        const {sessionID} = req.params;
        if (sessionID) {
            USERS.find({
                where: {
                    session: sessionID
                },
                raw: true
            })
                .then((data) => {

                    tpl = tpl.replace(/\{og:title\}/, OG.title);

                    console.log(tpl);
                    tpl = tpl.replace(/\{og:description\}/, OG.description);
                    tpl = tpl.replace(/\{og:image\}/, `${PUBLIC_URL}/images/${sessionID}-600x338.jpg`);
                    tpl = tpl.replace(/\{og:video\}/, `${PUBLIC_URL}/video/${sessionID}.mp4`);
                    tpl = tpl.replace(/\{og:url\}/, `${PUBLIC_URL}${req.originalUrl}`);


                    tpl = tpl.replace(/\{content\}/, `<video src="${PUBLIC_URL}/video/${sessionID}.mp4"></video>`);


                    res.send(tpl);
                })
        } else {
            tpl = tpl.replace(/\{og:title\}/, OG.title);
            tpl = tpl.replace(/\{og:description\}/, OG.description);
            tpl = tpl.replace(/\{og:image\}/, ``);
            tpl = tpl.replace(/\{og:video\}/, ``);
            tpl = tpl.replace(/\{og:url\}/, `${req.protocol}://${req.headers.host}${req.originalUrl}`);

            res.send(tpl);
        }


    });

};

export const routes = (app, router) => {

    adminRoutes(router);

    router.get('/', renderStatic);
    router.get('/moderator', renderStatic);
    router.get('/player/:sessionID', renderStatic);

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
                        sharp(imageBuf)
                            .resize(600, 338)
                            .overlayWith(__dirname + '/play.png', {
                                gravity: sharp.gravity.centre
                            })
                            .jpeg({progressive: true, quality: 100})
                            .toFile(PATHS.image + id + '-600x338.jpg');

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

                ffmpeg(PATHS.videoPatterns + `pattern-${pattern}.mp4`)
                    .addInput(imageSrc)
                    .addOption('-filter_complex', `[1][0]scale2ref[i][m];[m][i]overlay=0:0:enable=\'between(t,${FRAME_RANGE.start},${FRAME_RANGE.end})\'[v]`)
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


    router.get('/getvideo/:sessionID', (req, res, next) => {

        const {sessionID} = req.params;

        console.log(sessionID);

        if (!sessionID) {

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
                session: sessionID
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
                    session: sessionID,
                    start: data.start,
                    status: data.status,
                    blocked: data.blocked
                });
            })

    });



    app.use(router);

    app.use(renderStatic);

};
