import { StyleSheet,Text, TouchableOpacity } from 'react-native'
import React from 'react'

type MyButtonProps = {
  title: string;
  onPress: () => void;
};

const MyButton: React.FC<MyButtonProps> = ({ title, onPress }) => {
  return (
    
        <TouchableOpacity 
        activeOpacity={0.4}
        style={
            styles.button
            }
            onPress={onPress}>
      <Text style={styles.text}> {title} </Text>
      </TouchableOpacity>

  );
};

export default MyButton;

const styles = StyleSheet.create({
button:{
backgroundColor:"green",
        paddingHorizontal:20,
            paddingVertical:15,
            borderRadius:10
},

text:{fontSize:15,color:"white",fontWeight:"bold"}    
}
); 