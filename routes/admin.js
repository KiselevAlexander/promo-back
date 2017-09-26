import {USERS} from '../models';

const checkPass = (req, res, next) => {
    const pass = req.query.pass || req.body.pass;

    if (pass && pass === 'maxdevelopment') {
        next();
    } else {
        res.status(401);
        res.send('Access denied');
    }
};

const getList = (req, res, next) => {
    USERS.all({
        attributes: ['id', 'session', 'status', 'blocked', 'createdAt', 'updatedAt'],
        raw: true,
        order: [['createdAt', 'DESC']]
    }).then((data) => {
        res.json(data);
        next();
    });
};

const change = (req, res, next) => {

    const {id, blocked} = req.body;

    if (id) {

        USERS.update({
            blocked: (blocked)
        }, {
            where: {
                id
            }
        })
            .then(() => {

                res.json({
                    success: 'ok'
                });
                next();

            })
            .catch((err) => {
                res.json({
                    error: {
                        code: 40002,
                        message: `DB error: ${err.message}`
                    }
                });
            })

    } else {
        res.json({
            error: {
                code: 40001,
                message: 'ID required'
            }
        });
    }

};

const deleteVideo = (req, res, next) => {

    const {id} = req.query;

    if (id) {
        USERS.destroy({
            where: {
                id
            }
        })
            .then(() => {

                res.json({
                    success: 'ok'
                });
                next();

            })
            .catch((err) => {
                res.json({
                    error: {
                        code: 40002,
                        message: `DB error: ${err.message}`
                    }
                });
            })

    } else {
        res.json({
            error: {
                code: 40001,
                message: 'ID required'
            }
        });
    }

};

const adminRoutes = (router) => {
    router.use('/admin', checkPass);
    router.get('/admin', getList);
    router.post('/admin', change);
    router.delete('/admin/:pass/:id', deleteVideo);

};

export default adminRoutes;