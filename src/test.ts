
import { Either, Result, left, right } from "./core/Result";
import { UseCase } from "./core/domain/UseCase";
import { BaseController } from "./core/infra/BaseController";

interface DomainError {
  message: string;
  value: any;
}

// This is how to many an 'any', number of parameters to an interface

type DomainErrorFactoryFunction = (...args: any[]) => DomainError;

// This is how to specify the types of the keys in an object

type DomainErrorMap = { 
  [x: string]: DomainError | DomainErrorFactoryFunction;
};

namespace CreateUserError {

  export class UsernameTakenError extends Result<DomainError> {    
    private constructor (username: string) {
      super(false, {
        message: `The username ${username} was already taken`,
        value: ''
      })
    }

    public static create (username: string): UsernameTakenError {
      return new UsernameTakenError(username);
    }
  }

  export class EmailInvalidError extends Result<DomainError> {    
    private constructor (email: string, err?: any) {
      super(false, {
        message: `The email ${email} was invalid`,
        value: err
      })
    }

    public static create (email: string, err?: any): EmailInvalidError {
      return new EmailInvalidError(email, err);
    }
  }

}

interface CreateUserUseCaseDTO { username: string, email: string }

type CreateUserUseCaseResponse = Either<
  CreateUserError.UsernameTakenError | 
  CreateUserError.EmailInvalidError
  , 
  Result<void>
>

class CreateUserUseCase implements UseCase<CreateUserUseCaseDTO, CreateUserUseCaseResponse> {
  
  private isEmailInvalid (email: string): boolean {
    return email.indexOf('.com') === -1;
  }

  execute (request: CreateUserUseCaseDTO): CreateUserUseCaseResponse {

    const { username, email } = request;

    if (username === 'stemmlerjs') {
      return left(CreateUserError.UsernameTakenError.create(username))
    }

    if (this.isEmailInvalid(email)) {
      return left(CreateUserError.EmailInvalidError.create(email))
    } 

    return right(Result.ok())
  }
}

const useCase = new CreateUserUseCase();

const result = useCase.execute({
  username: 'stemmlerjs',
  email: 'billbob@gmail.com'
})

class CreateUserController extends BaseController {
  private useCase: CreateUserUseCase;

  constructor (useCase: CreateUserUseCase) {
    super();
    this.useCase = useCase;
  }

  executeImpl (): Promise<any> {
    const { username, email } = this.req.body;

    try {
      const result = this.useCase.execute({ username, email });

      if (result.isLeft()) {
        const error = result.value;

        switch (error.constructor) {
          case CreateUserError.UsernameTakenError:
            return this.conflict(error.getValue().message)
          case CreateUserError.EmailInvalidError:
            return this.clientError(error.getValue().message);
          default:
            return this.fail(error.getValue().message);
        }
      } else {
        return this.ok(this.res);
      }
    } 
    
    catch (err) {
      return this.fail(err);
    }
  }
}