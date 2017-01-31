import NetworkInfo from 'react-native-network-info'
import cryptico from 'cryptico'

const ROOT_URL = 'http://flw-pms-dev.eu-west-1.elasticbeanstalk.com'
const BANKS_URL = '/banks'
const GET_CHARGED_URL = '/flwv3-pug/getpaidx/api/charge'
const VALIDATE_CHARGE_URL =  '/flwv3-pug/getpaidx/api/validate'

let IP = null
const requestBody = (data, method) => {
  return method === 'GET' ?
    null : JSON.stringify(data);
};

NetworkInfo.getIPAddress(ip => IP = ip)

const processRequest = (path, method, data) => {
  const url = ROOT_URL + path
  return fetch(url, {
    method  : method,
    headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    },
    body: requestBody(data, method)
  })
  .then(response => response.json())
  .catch(err => {
    throw (err);
  });
}

const getCardNumber = (cardno) => {
  return cardno ? cardno.replace(/\s?/g, '') : ''
}

const getExpiryDate = (expirydate) => {
  return expirydate ? expirydate.match(/\d+/g) : ''
}

class RaveApi {
  static PublicKey = 'baA/RgjURU3I0uqH3iRos3NbE8fT+lP8SDXKymsnfdPrMQAEoMBuXtoaQiJ1i5tuBG9EgSEOH1LAZEaAsvwClw==';
  
  static getAllBanks() {
    return processRequest(BANKS_URL, 'GET')
  }

  static serializeCardDetails(cardDetails) {
    const { cardno, expirydate, ...rest } = cardDetails
    const datesArr = getExpiryDate(expirydate)
    
    return {
      IP,
      cardno: getCardNumber(cardno),
      expirymonth: datesArr[0],
      expiryyear: datesArr[1],
      meta: [],
      ...rest
    }
  }
  
  static serializeAccountDetails(accountDetails) {
    return {
      IP,
      meta: [],
      narration: null,
      passcode: null,
      payment_type:'account',
      ...accountDetails
    }
  }
  
  static getPayload(requestChargeData) {
    return {
      PBFPubKey: requestChargeData.PBFPubKey,
      client   : cryptico.encrypt(JSON.stringify(requestChargeData), this.PublicKey).cipher
    }  
  }
  
  static chargeCard(cardDetails) {
    const { email='', cardno, expirydate, cvv } = cardDetails
    return new Promise((resolve, reject) => {
      // Simulate server-side validation
      if (getCardNumber(cardno).length < 16) {
        reject(`Card number must be 16 characters.`);
      }

      if (getExpiryDate(expirydate).join('').length < 3) {
        reject(`Invalid card expiry date.`);
      }

      if (cvv.length !== 3) {
        reject(`CVV must be at 3 characters`);
      }

      if (email.length < 1) {
        reject(`Email is required.`);
      }
      
      const requestChargeData = this.serializeCardDetails(cardDetails)
      return this.processPayment(GET_CHARGED_URL, this.getPayload(requestChargeData))
    });
  }

  static processPayment(url, payload) {
    return new Promise((resolve, reject) => {
      processRequest(url, 'POST', payload)
        .then(res => {
          (res.status == 'error')
          ? reject(res.message)
          : resolve(res)
        })
        .catch(err => reject(err))
    })
  }
  
  static chargeAccount(accountDetails) {
    return new Promise((resolve, reject) => {
      if (accountDetails.accountnumber.length < 1) {
        reject(`Account Number is required.`);
      }
      const requestChargeData = this.serializeAccountDetails(accountDetails)
      return this.processPayment(GET_CHARGED_URL, this.getPayload(requestChargeData))
    });    
  }

  static validateCharge(details) {
    return this.processPayment(VALIDATE_CHARGE_URL, details)
  }
}

export default RaveApi;
