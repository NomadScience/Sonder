#import <FBSDKLoginKit/FBSDKLoginKit.h>

FBSDKLoginButton *loginButton = [[FBSDKLoginButton alloc] init];
loginButton.center = self.view.center;
[self.view addSubview:loginButton];