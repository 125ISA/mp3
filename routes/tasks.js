var Task = require('../models/task.js');
var User = require('../models/user.js');
module.exports=function(router) {
    var tasksRoute = router.route('/');
    tasksRoute.get(async function(req,res) {
        try {
            var where = {};
            var sort={};

            if(req.query.where) {
                try{
                    where = JSON.parse(req.query.where);
                } catch (error) {
                    return res.status(400).json({
                        message:"Invalid where",
                        data: null
                    });
                }
            }

            if (req.query.sort) {
                try {
                    sort = JSON.parse(req.query.sort);

                } catch (error) {
                    return res.status(400).json({
                        message:"Invalid sort",
                        data: null
                    });
                }
            }

            var select = {};
            if (req.query.select) {
                try {
                    select = JSON.parse(req.query.select);
                } catch (error) {
                    return res.status(400).json ({
                        message:"task failed",
                        data: null
                    });
                }
            }

            if (Array.isArray(select) || select == null || typeof select !="object") {
                return res.status(400).json({
                    message:"failed selected",
                    data: null
                });
            }

            var skip = 0;
            var limit = 100;  
            if (req.query.skip != null) {
                skip = Number(req.query.skip);
            }   
            
            if (req.query.limit != null) {
                limit = Number(req.query.limit);

            }

            if ( !Number.isInteger(skip)|| skip <0 || !Number.isInteger(limit)|| limit<0) {
                return res.status(400).json({
                    message:"Invalid function",
                    data: null
                });
            }

            if (req.query.count == "true") {
                var total = await Task.countDocuments(where);

                return res.status(200).json ({
                    message:"success",
                    data: total
                });

            }

            var tasks = await Task.find(where).sort(sort).select(select).skip(skip).limit(limit);



            
            res.status(200).json({
                message: "retrieved successful",
                data: tasks
            });
        } catch (error) {
            res.status(500).json({
                message: "Error",
                data: null
            });
        }
    });

    //add new task
    tasksRoute.post(async function(req, res) {
        try {
            var name = req.body.name;
            var description = req.body.description;
            var deadline = req.body.deadline;
            var getUser = req.body.assignedUser;
            var completed = req.body.completed;

            if (typeof name !== "string" || !name.trim()||!deadline) {
                return res.status(400).json({
                    message:"Error information",
                    data: null
                });
            }

            if (isNaN(new Date(deadline).getTime())) {
                return res.status(400).json ({
                    message:"Deadline invalid",
                    data: null
                });
            }

            if(completed == null) {
              completed = false;
            }

            if (typeof completed != "boolean") {
                return res.status(400).json({
                    message :"invalid",
                    data: null
                });
            }
            var user = null;

            if (getUser) {
                user = await User.findById(getUser);

                if (user == null) {
                    return res.status(404).json ({
                        message:"404 not found",
                        data: null
                    });
                }
            }

            var task = new Task({
                name: name,
                description: description,
                deadline: deadline
            });

            task.completed = completed;

            

            if (user != null) {
               task.assignedUser = user._id.toString();
               task.assignedUserName = user.name;
            }
            var result = await task.save();

            if (user != null && completed == false) {
                user.pendingTasks.push(result._id.toString());
                await user.save();
            }

            res.status(201).json ({
                message:"Created task",
                data: result
            });

        } catch (error) {
            if (error.name == "CastError" || error.name == "ValidationError") {
                return res.status(400).json({
                    message: "Information invalid",
                    data: null
                });
            }

            res.status(500).json({
                message:"Failed creating task",
                data: null
            });
        }
    });


    //id to get task
    router.get('/:id', async function(req,res) {
        try {
            var id = req.params.id;
            var select = {};

            if (req.query.select) {
              try {
                    select = JSON.parse(req.query.select);
                } catch (error) {
                    return res.status(400).json({
                      message: "Failed selected",
                      data: null
                    });
                }
            }

            var task = await Task.findById(id).select(select);

            if (task == null) {
                return res.status(404).json({
                  message: "task not found",
                  data: null
                });
            }

            res.status(200).json({
                message: "Read task information",
                data: task
            });
        } catch (error) {
            if (error.name == "CastError") {
                return res.status(404).json({
                    message: "task not found",
                    data: null
                });
            }

            res.status(500).json({
                message:"Error",
                data: null
            });
        }
    });

    //edited task
    router.put('/:id', async function(req,res) {

        try {
            var id = req.params.id;
            var task = await Task.findById(id);

            if (task == null) {
                return res.status(404).json({
                    message: "Does not exist",
                    data: null
                });
            }

            var name = req.body.name;
            var deadline = req.body.deadline;
            var description = req.body.description;
            var completed = req.body.completed;
            var getUser = req.body.assignedUser;
            var user = null;



            

            if (typeof name != "string" || name.trim() == "") {
                return res.status(400).json({
                    message: "Invalid task name",
                    data: null
                });
            }

            if (!deadline) {
                return res.status(400).json({
                    message:"Missing deadlines",
                    data: null

                });
            }

            var date = new Date(deadline);

            if(isNaN(date.getTime())) {
                return res.status(400).json({
                    message:"Deadline setup error",
                    data: null
                });
            }

            if (completed != null && typeof completed != "boolean") {
              return res.status(400).json({
                message: "Invalid completed",
                 data: null
               });
             }

            if (description != null && typeof description != "string") {
              return res.status(400).json({
                message: "Invalid description",
                 data: null
               });
             }


            if (getUser) {
                if (typeof getUser != "string") {
                    return res.status(400).json ({
                        message:"invalid User",
                        data: null
                    });
                }

                try {
                    user = await User.findById(getUser);

                } catch (error) {
                    return res.status(400).json({
                        message:"invalid User",
                        data: null
                    });
                }

                if (user == null ){
                    return res.status(404).json ({
                        message: "User not found",
                        data: null
                    });
                }

                if (req.body.assignedUserName != null && req.body.assignedUserName != user.name) {
                   return res.status(400).json({
                       message: "Invalid user name",
                       data: null
                    });
                }

            }

            task.name = name;
            task.deadline = date;

            if(description == null) {
                task.description = "";
            } else {
                task.description = description;
            }

            if (completed == null) {
                task.completed = false;

            } else {
                task.completed = completed;
            }


            //update
            var oldUser = null;

            if (task.assignedUser != "") {
                oldUser = await User.findById(task.assignedUser);
            }

            if (oldUser != null) {
                var index = oldUser.pendingTasks.indexOf(id);

                if (index != -1) {
                    oldUser.pendingTasks.splice(index,1);
                    
                    }
                    await oldUser.save();
                }
    

            if (user!= null) {
                task.assignedUser = user._id.toString();
                task.assignedUserName = user.name;
            } else {
                task.assignedUser = "";
                task.assignedUserName = "unassigned";

            }

            

            if(user != null && task.completed == false) {
                var newUser = await User.findById(user._id);
                if (newUser.pendingTasks.indexOf(id)==-1) {
                    newUser.pendingTasks.push(id);
                }

                await newUser.save();

            }

            var result = await task.save();

            res.status(200).json({
                message:"task updated",
                data: result
            });
        } catch (error) {
            if (error.name == "CastError" && error.path == "_id") {
                return res.status(404).json({
                    message : "Task does not exist",
                    data : null
                
                });
            }

            if (error.name == "ValidationError" || error.name == "CastError") {
                return res.status(400).json({
                    message: "Invalid information",
                    data: null
                });
            }

            res.status(500).json({
                message:"Failed to updated task",
                data: null

            });
        }
    });

    //delete
    router.delete("/:id", async function(req, res) {
        try {
            var id = req.params.id;
            var task = await Task.findById(id);

            if (task == null) {
                return res.status(404).json({
                    message :"task not found",

                    data:null
                });
            }

            //remove task
            if (task.assignedUser != "") {
                var user = await User.findById(task.assignedUser);
                if (user!= null) {
                    var index = user.pendingTasks.indexOf(id);

                    if(index != -1) {
                        user.pendingTasks.splice(index, 1);
                        await user.save();
                    } 
                }
            }

            await task.deleteOne();

            res.status(204).send();
        } catch(error) {
            if (error.name == "CastError") {
                return res.status(404).json({
                    message: " task not found",
                    data: null
                });

            }

            res.status(500).json({
                message: "Failed to delete",
                data: null
            });
        }
    });




    return router;
};

