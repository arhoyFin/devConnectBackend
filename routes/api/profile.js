const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

// Load validation
const validateProfileInput = require('../../validation/profile');
const validateExperienceInput = require('../../validation/experience');
const validateEducationInput = require('../../validation/education');
// Load the models
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   GET api/profile/test
// @desc    Tests profile route
// @access  Public
router.get('/test', (req, res) => res.json({ msg: 'Profile Works' }));

// @route   GET api/profile
// @desc    Get current users profile
// @access  Private (since protected route, bring in passport middleware)
// since this is private route, need to use get on postman with json web token: id / email / password
// set up a profile with a created handle, status and skills
router.get('/', passport.authenticate('jwt',{session:false}), (req, res) => {
    const errors = {};
    Profile.findOne({user:req.user.id})
    .populate('user',['name','email','avatar'])
    .then( profile=>{
        if(!profile){
            errors.noprofile = 'error in getting profile, no profile for this user';
            return res.status(404).json(errors);
        }
        res.json(profile)
    })
    .catch( err => res.status(404).json({message:`problem with api profile route: ${err}`}))

})



// @route   GET api/profile/user/:user
// @desc    Get profile by user
// @access  Public?

router.get('/user/:user_id',(req,res)=>{
    const errors = {}
    Profile.findOne({user: req.params.user_id }) // will grab whatever is in :handle part of the url and match to what is in db.
        .populate('user',['name','avatar']) // adds this to the profile json response. user db and params to grab
        .then( profile =>{
            if(!profile){
                errors.noprofile = 'There is no profile for this user';
                res.status(404).json(errors)
            }
            res.json(profile)
        })
        .catch( err => res.status(404).json({message:'There is no profile for this user',err}));

})

// @route   GET api/profile/all
// @desc    Get all profiles
// @access  Public
router.get('/all',(req,res)=>{
    const errors = {}
    Profile.find()
    .populate('user',['name','avatar'])
    .then( profiles => {
        if(!profiles){
            errors.noprofiles = 'There are no profiles!';
            res.status(404).json(errors);
        }
        res.json(profiles);
    })
    .catch( err => res.status(404).json({message:'There is no profiles for this user',err}));
})

// @route   GET api/profile/handle/:handle
// @desc    Get profile by handle
// @access  Public

router.get('/handle/:handle',(req,res)=>{
    const errors = {}
    Profile.findOne({handle: req.params.handle }) // will grab whatever is in :handle part of the url and match to what is in db.
        .populate('user',['name','avatar'])
        .then( profile =>{
            if(!profile){
                errors.noprofile = 'There is no profile for this user';
                res.status(404).json(errors)
            }
            res.json(profile)
        })
        .catch( err => console.log('router.get(/handle:handle) failed! ',err));

})




// @route   POST api/profile
// @desc    Create users profile
// @access  Private (since protected route, bring in passport middleware)
// since this is private route, need to use get on postman with json web token: handle / status / skills
router.post('/', passport.authenticate('jwt',{session:false}),
  (req, res) => {
//    console.log('user id: ',req.user.id)
    const { errors, isValid } = validateProfileInput(req.body);

    // Check Validation
    if(!isValid){
        //return errors with 400 bad request
        return res.status(400).json(errors)
    }

    // get fields
    const profileFields = {};

    profileFields.user= req.user.id;
   
    if(req.body.handle) profileFields.handle = req.body.handle;
    if (req.body.company) profileFields.company = req.body.company;
    if(req.body.website) profileFields.website = req.body.website;
    if(req.body.location) profileFields.location = req.body.location;
    if (req.body.bio) profileFields.bio = req.body.bio;
    if (req.body.status) profileFields.status = req.body.status;
    if(req.body.githubusername) profileFields.githubusername = req.body.githubusername;
    // Skills split into array.
    if( typeof req.body.skills !== 'undefined'){
        profileFields.skills = req.body.skills.split(','); // an array of skills to put into the database.
    } 
    // Social
    profileFields.social = {};
    if(req.body.youtube) profileFields.social.youtube = req.body.youtube;
    if(req.body.facebook) profileFields.social.facebook = req.body.facebook;
    if(req.body.twitter) profileFields.social.twitter = req.body.twitter;
    if(req.body.linkedin) profileFields.social.linkedin = req.body.linkedin;
    if(req.body.instagram) profileFields.social.instagram = req.body.instagram;
    Profile.findOne({user:req.user.id})
        .then(profile => {
          
            if(profile){
                // update the profile
                Profile.findOneAndUpdate(
                    {user:req.user.id}, // find the user
                    {$set:profileFields}, // update the user with these new fields
                    {new:true} // update before displaying
                )
                .then( profile => {
                    res.json(profile)
                })
              
            }
            else{
                // create the profile
                // Check if handle exists. Want the handle to be unique
            
                Profile.findOne({handle:profileFields.handle})
                    .then(profile => {
                        if(profile){
                            errors.handle = 'The handle already exists!'
                            res.status(400).json(errors);
                        }
                    
                        // Save profile
                        new Profile(profileFields).save()
                            .then(profile => res.status(200).json(profile))
                    })
            }
            
        })
        .catch(err=>{console.log(err)})
})

// @route   POST api/profile/experience
// @desc    Add Experience
// @access  Private 
// @route   POST api/profile/experience
// @desc    Add experience to profile
// @access  Private
// @ x-www-form-urlencoded!
router.post(
    '/experience',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
      const { errors, isValid } = validateExperienceInput(req.body);
  
      // Check Validation
      if (!isValid) {
        // Return any errors with 400 status
        return res.status(400).json(errors);
        
      }

  
      Profile.findOne({ user: req.user.id }).then(profile => {
        const newExp = {
          title: req.body.title,
          company: req.body.company,
          location: req.body.location,
          from: req.body.from,
          to: req.body.to,
          current: req.body.current,
          description: req.body.description
        };
  
        // Add to exp array
        profile.experience.unshift(newExp); // add to profile collection rather than save a a new document
        profile.save().then(profile => res.json(profile));

      });
    }
  );


// @route   POST api/profile/education
// @desc    Add education
// @access  Private 
// @desc    Add education to profile
// @access  Private
  router.post(
    '/education',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
      const { errors, isValid } = validateEducationInput(req.body);
  
      // Check Validation
      if (!isValid) {
        // Return any errors with 400 status
        return res.status(400).json(errors);
      }
  
      Profile.findOne({ user: req.user.id }).then(profile => {
        const newEdu = {
          school: req.body.school,
          degree: req.body.degree,
          fieldofstudy: req.body.fieldofstudy,
          from: req.body.from,
          to: req.body.to,
          current: req.body.current,
          description: req.body.description
        };
  
        // Add to exp array
        profile.education.unshift(newEdu);
  
        profile.save().then(profile => res.json(profile));
      });
    }
  );


// @route   DELETE api/profile/experience
// @desc    DELETE experience
// @access  Private
router.delete('/experience/:exp_id', passport.authenticate('jwt',{session:false}), (req,res) => {
    const errors = {}
       // console.log('deleting you')
    Profile.findOne({user:req.user.id})
        .then(profile => {
           // profile.experience is an array of `experience objects
            // Go iwhat index of the array to remove
            
            
            const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id); // interestingly we must use item.id for map method.
          // check if the experience exists
            if(removeIndex === -1){
                errors.nodeToDelete = 'There is no experience to delete!';
                res.status(400).json(errors);
            }

            else{
                profile.experience.splice(removeIndex,1); // remove 1 element starting from removeIndex

                // save the updated profile and return response as json
                profile.save()
                    .then(profile=> res.json(profile))
                    .catch(err=> {
                            console.log('profile could not be saved for route experience/:exp_id',err)
                            res.status(400).json({'msg':err})
                    })
            }
        })
})

// @route   DELETE api/profile/education
// @desc    DELETE education
// @access  Private
router.delete('/education/:edu_id', passport.authenticate('jwt',{session:false}), (req,res) => {
    const errors = {};
    Profile.findOne({user:req.user.id})
        .then(profile => {
                   
            const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id); // interestingly we must use item.id for map method.
            if(removeIndex === -1){
                errors.nodeToDelete = 'There is no education to delete!';
                res.status(400).json(errors);
            }
            else{
                profile.education.splice(removeIndex,1); 
                profile.save()
                    .then(profile=> res.json(profile))
                    .catch(err=> {
                            console.log('profile could not be saved for route education/:exp_id',err)
                            res.status(400).json({'msg':err})
                    })
            }
        })
})

// @route   DELETE api/profile/
// @desc    DELETE user and profile
// @access  Private
// @access Error in delete user router
router.delete('/', passport.authenticate('jwt',{session:false}), (req,res) => {
    Profile.findOneAndRemove({user:req.user.id})
        .then(() => {
            User.findOneAndRemove({_id:req.user.id})
                .then(()=>{
                    res.json({success:true});
                })
                .catch(err=> res.json({msg: `could not remove user: ${err}`}))
        })
        .catch(err=> res.json({msg: `could not remove profile: ${err}`}))
})

module.exports = router;
