const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/userModels');
const passport = require('passport');
const Loan = require('../models/loanModels');
const nodemailer = require("nodemailer");


var Finance = require('financejs');
var finance = new Finance();


//showing all loans

router.get('/showall', isLoggedIn, (req, res) => {
    Loan.find({}, (err, loans) => {
        if (err) {
            console.log(err);
        } else {
            var filterLoans = loans.filter(loan => {

                return (!loan.recepient.equals(req.user._id));
            })

            User.findById(req.user._id,(err,user)=>{
                if(err){
                    console.log(err);
                }else{
                    res.render('loan/all', { loans: filterLoans ,user:user});
                }
            })
            
        }
    });
});

//---------------------

//new loan routes ------------------

router.get('/new', isLoggedIn, (req, res) => {
    res.render('loan/newloan');
});

router.post("/new", isLoggedIn, (req, res) => {
    Loan.create({
        recepient: req.user._id,
        amtReq: req.body.amount,
        interest: req.body.interest,
        dateRequested: Date.now(),
        dateDue: req.body.date*30,
        dateRemaining: (req.body.date*30)-1,
        emi: finance.AM(req.body.amount,req.body.interest,req.body.date,1)
    }, (err, loan) => {
        if (err) {
            console.log(err);
            res.redirect('/loan/new');
        } else {
            User.findById(req.user._id, (err, user) => {
                if (err) {
                    console.log(err);
                } else {
                    user.loansTaken.push(loan._id);
                    user.save();
                    res.redirect(`/loan/${loan._id}`);
                }

            })

        }

    })
})

//------------------------

//loan details-----------------

router.get('/:loanid', isLoggedIn, (req, res) => {
    Loan.findById(req.params.loanid, (err, loan) => {
        res.render('loan/loandetails', { loan: loan });
    })
})

//----------------

//bidding routes------------

router.get('/:loanid/bid', isLoggedIn, (req, res) => {
    Loan.findById(req.params.loanid, (err, loan) => {
        if (err) {
            console.log(err);
        } else {
           
            User.findById(req.user._id,(err,user)=>{
                res.render('loan/bid', { loan:loan ,user:user});
            })
           
        }
    });

});



router.post('/:loanid/bid', (req, res) => {
    Loan.findById(req.params.loanid, (err, loan) => {
        if (err) {
            console.log(err);
        } else {
            if (req.body.amount <= (loan.amtReq - loan.amtSatisfied) && req.body.amount != 0) {

                User.findById(req.user._id, (err, user) => {
                    if (err) {
                        console.log(err);
                    } else {

                        if (user.wallet >= req.body.amount) {
                            loan.collablender.push({ _id: user._id, amtcontrib: req.body.amount })
                            let newsat = parseInt(loan.amtSatisfied) + parseInt(req.body.amount);
                            loan.amtSatisfied = newsat;
                            if (loan.amtSatisfied == loan.amtReq) {
                                //console.log(loan.status);
                                loan.status = 'accepted';
                                User.findById(loan.recepient, (err, user) => {
                                    if (err) {
                                        console.log(user);
                                    } else {
                                        user.wallet += loan.amtReq;
                                        loan.collablender.forEach(lender=>{
                                            User.findById(lender._id, (err,lender)=>
                                            {
                                               if (err){
                                                   console.log(err);

                                               }
                                               else{
                                                lender.wallet-=lender.amtcontrib;
                                                lender.save();
                                            }
                                            })
                                        })
                                        user.save();
                                    }

                                });
                            }
                            user.wallet = parseInt(user.wallet) - parseInt(req.body.amount);
                            loan.save();
                            user.save();
                            res.render('loan/bidsuccess');
                        }
                        else {
                            res.redirect('/loan/showall');
                        }


                    }
                })



            }
            else {
                res.redirect('/loan/', req.params.loanid);
            }


        }
    })

})

function isLoggedIn(req, res, next) {
    // console.log(req.isAuthenticated());
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/user/login');
}

var dayDuration = 10000;

var interTimer = setInterval(() => {
    Loan.find({ status: 'pending' }, (err, loans) => {
        if (err) {
            console.log(err);
        } else {
            if (loans.length !== 0) {
                loans.forEach(loan => {
                    if (loan.timeForBid <= 0) {
                        loan.status = 'declined';
                        if(loan.collablender.length>0){
                            loan.collablender.forEach(lender=>{

                                User.findById(lender._id,(err,len)=>{
                                    len.wallet += lender.amtcontrib;
                                    len.save();
                                });

                            })
                        }
                        

                    }
                    (async () => {
                        loan.timeForBid -= 1;
                    })();

                    loan.save();
                })
            } 
        }

    });

   
}, dayDuration);

                        

<<<<<<< HEAD
=======
                  

>>>>>>> 5c1f757d4923d6e8b8fa361296c719881a871af5
var installMentTimer = setInterval(()=>{

    Loan.find({status:'accepted'},(err,loans)=>{
        loans.forEach(loan=>{
           // console.log(loan.dateRemaining);
            if(loan.dateRemaining%30===0){
                
                User.findById(loan.recepient,(err,recepient)=>{
                    recepient.wallet-=loan.emi;
                    if(recepient.wallet>=0){
                        recepient.save();
                        loan.collablender.forEach(lender=>{
                            User.findById(lender._id, (err,lenderr)=>{
                                //console.log(parseFloat((lender.amtcontrib/loan.amtReq)*(loan.emi)));
                                lenderr.wallet += parseFloat((lender.amtcontrib/loan.amtReq)*(loan.emi));
                                lenderr.save();
                            });
                        })
                    }else{
                            loan.status = 'default';
                            var transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                  user: 'alaapbanerjee08@gmail.com',
                                  pass: 'ALAAP008'
                                }
                              });
                              
                              var mailOptions = {
                                from: 'alaapbanerjee08@gmail.com',
                                to: 'user.email',
                                subject: 'Sending Email using Node.js',
                                text: 'That was easy!'
                              };
                              
                              transporter.sendMail(mailOptions, function(error, info){
                                if (error) {
                                  console.log(error);
                                } else {
                                  console.log('Email sent: ' + info.response);
                                }
                              });
                        console.log("Hello Defaulter");
                    }  
                });

              
            }

            loan.dateRemaining-=1;
            loan.save();
        })
    })


},dayDuration);


// var defaultTimer = setInterval(()=>{
//     Loan.find({status: 'default'},(err,loans)=>{
//         loans.forEach(loan=>{
//             console.log('hello');
//             User.findById(loan.recepient._id,(err,user)=>{
//                 const sgMail = require('@sendgrid/mail');
//                 sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//                 const msg = {
//                             to: user.email,
//                             from: 'alaapbanerjee08@gmail.com',
//                             subject: 'Sending with Twilio SendGrid is Fun',
//                             text: 'and easy to do anywhere, even with Node.js'
// };
// sgMail.send(msg);
//             })
//         })
//     })
// },dayDuration)


module.exports = router;
