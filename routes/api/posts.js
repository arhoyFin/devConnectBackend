const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

// Bring in the Post and Profile Model
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');

// Load validation
const validatePostInput = require('../../validation/post');

// @route   GET api/posts/test
// @desc    Tests post route
// @access  Public
router.get('/test', (req, res) => res.json({ msg: 'Posts Works' }));

// @route POST api/posts
// @desc Create post and add to the post db
// @access Private
router.post('/',passport.authenticate('jwt',{session:false}),(req,res)=>{

    const { errors, isValid } = validatePostInput(req.body);

    const newPost = new Post({
        text: req.body.text,
        user: req.user.id,
        name:req.body.name,
        avatar: req.body.avatar
    });

    if(!isValid){
        return res.status(400).json(errors)
    }
    newPost
        .save()
        .then( post =>  res.status(200).json(post) )
        .catch(err => res.status(400).json({msg:`There was an error saving the new post ${err}`} ))

    
})



// @route GET api/posts
// @desc Get all the posts READ ONLY
// @access Public
router.get('/',(req,res)=>{
    Post
    .find()
    .sort({date: -1})
    .then( post => res.status(200).json(post) )
    .catch( err => res.status(400).json({msg:`cannot get all posts right now ${err}`}) );
})



// @route GET api/posts
// @desc Get specific post READ ONLY
// @access Pubic
router.get('/:id',(req,res)=>{
    Post
    .findById(req.params.id)
    .then( post => res.status(200).json(post) )
    .catch( err => res.status(404).json({msg:`cannot find this post! ${err}`}) );
})

// @route DELETE api/posts
// @routeNumber: delete_post_specific
// @desc Delete a post
// @access Private
router.delete('/:id',passport.authenticate('jwt',{session:false}),(req,res)=>{
    Profile.findOne({user:req.user.id})
        .then(profile=>{
                Post.findById(req.params.id)
                    .then( post =>{
                        // check for the post owner
                        if(post.user.toString() !== req.user.id){
                            return res.status(401).json({msg:'not authorized is not valid: delete_post_specific'})
                        }
                        post.remove()
                            .then( () => res.status(200).json({msgSuccess:'Post deleted'}))
                            .catch(err=> res.status(404).json({msg:'There was an error, post not found'}))
                    })
                    .catch(err=> res.status(400).json({msg:'user not found on delete_specific_post'}))
        })
        .catch(err=> res.status(400).json({msg:'cannot delete specific post, post.js'}))

})

// @route POST api/post/like/:id
// @desc Like a post
// @access Private
router.post('/like/:id',passport.authenticate('jwt',{session:false}),(req,res)=>{
       
        Profile.findOne({user:req.user.id})
            .then(profile =>{
                Post.findById(req.params.id)
                    .then(post =>{
                        // handle the likes to a post.
                        if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0){
                            return res.status(400).json({alreadyLiked:'User has already liked this post!'})
                        }
                        // if user is not in likes array then add user...
                        post.likes.unshift({user:req.user.id});
                        post.save()
                            .then( like => res.json(like))
                            .catch(err => res.status(400).json({msg:'Error in saving profile'}))
                    })
                    .catch(err=> res.status(404).json({postnotfound:'No post found'}));
            })
})


// @route POST api/post/unlike/:id
// @desc unlike a post
// @access Private
router.post('/unlike/:id',passport.authenticate('jwt',{session:false}),(req,res)=>{
       
    Profile.findOne({user:req.user.id})
        .then(profile =>{
            Post.findById(req.params.id)
                .then(post =>{
                    if(post.likes.length > 0){
                            post.likes.forEach( (like,i) => {
                                if(req.user.id === like.user.toString()){
                                    // remove the like
                                    post.likes.splice(i,1);
                                    post.save()
                                        .then( ()=> res.json({msg:'unliked this post!'}) ) 
                                        .catch( ()=> res.json({msg:'could not unlike!'}))
                                }
                            else{
                                return res.status(400).json({notliked:'You have not yet liked this post'})
                            }
                        })
                    }
                    return res.status(404).json({notliked:'Not able to unliked post'})
                    
                })
                .catch(err=> res.status(404).json({postnotfound:'No post found'}));
        })
})

// @route POST api/post/comment/:id
// @desc Add a comment to the post
// @access Private
router.post('/comment/:id',passport.authenticate('jwt',{session:false}),(req,res)=>{
    
    const {errors,isValid} = validatePostInput(req.body);

    if(!isValid){
        return res.status(400).json(errors);
    }

    Post.findById(req.params.id)

        .then(post =>{
            const newComment = {
                text:req.body.text,
                name:req.body.name,
                avatar:req.body.avatar,
                user:req.user.id
            }

            post.comments.unshift(newComment);
            post.save()
                .then( post => res.json(post))
                .catch(err => res.status(404).json({postnotfound:'Post not found'}) );

        })

        .catch(err=> res.status(404).json({postnotfound:'No post found'}));
})

// @route DELETE api/post/comment/:id
// @desc Remove a comment from post
// @access Private
// @url form comment/:postid/:comment_id
router.delete('/comment/:id/:comment_id',passport.authenticate('jwt',{session:false}),(req,res)=>{


    Post.findById(req.params.id)

        .then(post =>{
           if( post.comments.filter( comment => comment._id.toString() === req.params.comment_id).length === 0 ) {
                // comment does not exsist
               return  res.status(404).json({commentnotexist:'comment does not exist'});
           }

           const removeIndex = post.comments
                                    .map( item => item._id.toString() )
                                    .indexOf(req.params.comment_id);
                
            post.comments.splice(removeIndex,1);

            post.save()
                .then( post => res.json(post))
        })

        .catch(err=> res.status(404).json({postnotfound:'No post found'}));
})

module.exports = router;
