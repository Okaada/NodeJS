const express = require('express');
const authMiddleware = require('../middlewares/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');


const router = express();

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().populate(['user', 'tasks']);
        return res.send({ projects });
    } catch (error) {
        return res.status(400).send({ error: 'Canot Load Projects' })

    }
});


router.get('/:projectId', async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId).populate(['user', 'tasks']);

        return res.send({ project })
    } catch (error) {
        return res.status(400).send({ error: 'Cannot Show Project' })
    }
})

router.post('/', async (req, res) => {
    try {
        const { title, description, tasks } = req.body;

        const project = await Project.create({ title, description, user: req.userId });

        await Promise.all(tasks.map(async tasks => {
            const projectTasks = new Task({ ...tasks, project: project._id });


            await projectTasks.save();
            project.tasks.push(projectTasks);


        }));

        await project.save()

        return res.send({ project });

    } catch (error) {
        return res.status(400).send({ error: 'Cannot Create a Project' })
    }


})

router.put('/:projectId', async (req, res) => {

    const { title, description, tasks } = req.body;

    try {
        //NEW: TRUE 
        //This part of the code makes the mongoose returns the updated project
        const project = await Project.findByIdAndUpdate(req.params.projectId, {
            title,
            description
        }, { new: true });

        project.tasks = [];
        await Task.remove({ project: project._id })

        await Promise.all(tasks.map(async tasks => {
            const projectTasks = new Task({ ...tasks, project: project._id });


            await projectTasks.save();
            project.tasks.push(projectTasks);


        }));

        await project.save()

        return res.send({ project });

    } catch (error) {

        return res.status(400).send({ error: 'Cannot Create a Project' })

    }

})

router.delete('/:projectId', async (req, res) => {
    try {

        //req.params.projectId It's similiar to [FROMQUERY] on ASP.NET CORE
        //It means that the projectId on the endpoint is my parameter here
        await Project.findByIdAndRemove(req.params.projectId).populate('user');

        res.send()
    } catch (error) {
        res.status(400).send({ error: 'Failed when removing a project' });
    }
})
module.exports = app => app.use('/projects', router);