import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  body:{
    backgroundColor: 'black',

  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'offwhite',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  profilePicture: {
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
  },
  email: {
    fontSize: 16,
    color: 'black',
    marginVertical: 5,
  },
  details: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
    color: 'black',
  },
  contentView: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '90%',
  },
   defaultText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});
