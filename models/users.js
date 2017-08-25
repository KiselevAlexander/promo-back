import Sequelize from 'sequelize';
import {sequelize} from '../sequelize.config';


export const USERS = sequelize.define('users', {
    id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
    name: {type: Sequelize.STRING},
    session: {type: Sequelize.STRING},
    start: {type: Sequelize.DATE},
    end: {type: Sequelize.DATE},
    status: {type: Sequelize.INTEGER, default: 0}, // 0 - нет данных, 1- изображение загружено, 2 - идет создание видео, 3 - видео создано, 4 - ошибка
    perc: {type: Sequelize.INTEGER, default: 0}
});

// force: true will drop the table if it already exists
USERS.sync({force: false});
