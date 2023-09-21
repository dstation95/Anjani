/**
 *
 * Homepage
 *
 */

import React, { Component } from 'react';

// import { Link } from 'react-router-dom/cjs/react-router-dom';
import { Link } from 'react-router-dom';

import { connect } from 'react-redux';
import actions from '../../actions';
import banners from './banners.json';
import { Button, Button2 } from './Button';
// import Cards from './Cards';
// import HeroSection from './HeroSection';
import './HeroSection.css';

class Homepage extends Component {
  handleContactClick= () => {  
    console.log("hello") 
    this.props.history.push("/contact");
  };

  handleStyle = () => {  
    console.log("hello2")
    this.props.history.push("/shop");
  };

  handleClick = () => {
    this.props.history.push("/shop");
  };

  CardItem(props) {
    return (
      <>
        <li className='cards__item'>
          <Link className='cards__item__link' to={props.path}>
            <figure className='cards__item__pic-wrap' data-category={props.label}>
              <img
                className='cards__item__img'
                alt='Travel Image'
                src={props.src}
              />
            </figure>
            <div className='cards__item__info'>
              <h5 className='cards__item__text'>{props.text}</h5>
            </div>
          </Link>
        </li>
      </>
    );
  }

  render() {

    return (
      <>
    <div>
    <div className='hero-container'>
      {/* <img src='/images/eid.webp'/> */}
      <h1>SHOP AUTHENTIC CLOTHING</h1>
      <p> Wear what makes you shine</p>
      <div className='hero-btns'>
        <Button
          className='btns'
          buttonStyle='btn--outline'
          buttonSize='btn--medium'
          onClick = {() => {this. handleExplore()}}
        >
          EXPLORE ITEMS
        </Button>
        <Button2
          className='btns'
          buttonStyle='btn--outline2'
          buttonSize='btn--medium'
          onClick={() => {handleExplore()}}
          style={{ marginLeft: '10px' }}
        >
            SEE ALL STYLES
        </Button2>
      </div>
    </div>
    </div>
<div>
<div className='cards'>
      <h1>Check out these Authentic Styles!</h1>
      <div className='cards__container'>
        <div className='cards__wrapper'>
          <ul className='cards__items'>
          <li className='cards__item'>
          <Link className='cards__item__link' to='/shop/brand/silk'>
            <figure className='cards__item__pic-wrap' data-category='Traditional Silk'>
              <img
                className='cards__item__img img-design'
                // alt='Travel Image'
                src='images/img-2.jpg'
              />
            </figure>
            <div className='cards__item__info'>
              <h5 className='cards__item__text'>Traditional Silk Sarees made with authentic smooth silk</h5>
            </div>
          </Link>
        </li>
        <li className='cards__item'>
          <Link className='cards__item__link' to='/shop/brand/readymade'>
            <figure className='cards__item__pic-wrap' data-category='Readymade'>
              <img
                className='cards__item__img img-design'
                // alt='Travel Image'
                src='images/img-2.jpg'
              />
            </figure>
            <div className='cards__item__info'>
              <h5 className='cards__item__text'>Readymade Dresses coming with three peice easy to wear design</h5>
            </div>
          </Link>
        </li>
          </ul>
          <ul className='cards__items'>
          <li className='cards__item'>
          <Link className='cards__item__link' to='/shop/brand/half-sarees'>
            <figure className='cards__item__pic-wrap' data-category='Half Sarees'>
              <img
                className='cards__item__img img-design'
                // alt='Travel Image'
                src='images/img-2.jpg'
              />
            </figure>
            <div className='cards__item__info'>
              <h5 className='cards__item__text'>Half Sarees with easy to wear and light desing</h5>
            </div>
          </Link>
        </li>
        <li className='cards__item'>
          <Link className='cards__item__link' to='/shop/brand/blouses'>
            <figure className='cards__item__pic-wrap' data-category='Blouses'>
              <img
                className='cards__item__img img-design'
                // alt='Travel Image'
                src='images/img-2.jpg'
              />
            </figure>
            <div className='cards__item__info'>
              <h5 className='cards__item__text'>Blouses for equisite presentation and detailed designs</h5>
            </div>
          </Link>
        </li>
        <li className='cards__item'>
          <Link className='cards__item__link' to='/shop/brand/saree'>
            <figure className='cards__item__pic-wrap' data-category='Kids'>
              <img
                className='cards__item__img img-design'
                // alt='Travel Image'
                src='images/img-2.jpg'
              />
            </figure>
            <div className='cards__item__info'>
              <h5 className='cards__item__text'>Kids Dresses for ages as young as 2 years old</h5>
            </div>
          </Link>
        </li>
          </ul>
        </div>
      </div>
    </div>
</div>
<div className='about-us'>
          <div className='about-us-content'>
            <div className='about-us-text'>
              <h2 className='about-us-heading'>About Us</h2>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                pharetra risus et orci fermentum, quis varius justo bibendum.
                Nullam suscipit metus ut urna scelerisque dictum. Integer in
                nunc ut enim gravida sollicitudin.
              </p>
              <p>
                Nunc quis diam at elit condimentum tristique. Sed at odio nec
                augue fringilla tincidunt. Vestibulum pharetra justo id
                condimentum efficitur.
              </p>
              <button className='contact-button' onClick={() => {this.handleContactClick()}}>Contact Us</button>
            </div>
            <div className='about-us-image'>
              <img
                src='your-image-url.jpg'
                alt='About Us Image'
                width='200'
                height='200'
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default Homepage;